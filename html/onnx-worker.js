// Import ONNX Runtime Web
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');

let session = null;
const modelUrl = 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/onnx/model.onnx';

// Cache name for IndexedDB
const CACHE_NAME = 'onnx-model-cache';

// Initialize the model
async function initModel() {
    try {
        // Try to load from cache first
        const cachedModel = await getCachedModel();
        
        if (cachedModel) {
            console.log('Loading model from cache...');
            session = await ort.InferenceSession.create(cachedModel);
        } else {
            console.log('Downloading model...');
            const response = await fetch(modelUrl);
            if (!response.ok) throw new Error('Failed to download model');
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Cache the model
            await cacheModel(arrayBuffer);
            
            // Create session
            session = await ort.InferenceSession.create(arrayBuffer);
        }
        
        return { status: 'ready' };
    } catch (error) {
        console.error('Error initializing model:', error);
        throw error;
    }
}

// Cache the model in IndexedDB
async function cacheModel(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_NAME, 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('models')) {
                db.createObjectStore('models');
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const tx = db.transaction('models', 'readwrite');
            const store = tx.objectStore('models');
            
            store.put(arrayBuffer, 'model');
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        };
        
        request.onerror = (event) => {
            console.warn('Failed to open IndexedDB:', event.target.error);
            resolve(); // Don't fail if IndexedDB fails
        };
    });
}

// Get model from cache
async function getCachedModel() {
    return new Promise((resolve) => {
        const request = indexedDB.open(CACHE_NAME, 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const tx = db.transaction('models', 'readonly');
            const store = tx.objectStore('models');
            const getRequest = store.get('model');
            
            getRequest.onsuccess = () => resolve(getRequest.result || null);
            getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
    });
}

// Generate response using the ONNX model
async function generateResponse(inputText) {
    if (!session) {
        throw new Error('Model not initialized');
    }
    
    try {
        // Tokenize input (simplified - replace with actual tokenizer)
        const tokens = inputText.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        const inputIds = new Int32Array(tokens.map((_, i) => i + 1));
        
        // Prepare model inputs
        const inputs = {
            input_ids: new ort.Tensor('int32', inputIds, [1, inputIds.length]),
            attention_mask: new ort.Tensor('int32', new Int32Array(inputIds.length).fill(1), [1, inputIds.length])
        };
        
        // Run inference
        const results = await session.run(inputs);
        
        // Process output (simplified - replace with actual processing)
        const output = results.logits || results.output_logits;
        const outputTokens = [];
        
        // Simple greedy decoding
        for (let i = 0; i < 50; i++) { // Limit to 50 tokens
            const logits = output.data.slice(i * output.dims[2], (i + 1) * output.dims[2]);
            const nextToken = logits.indexOf(Math.max(...logits));
            if (nextToken === 0) break; // Stop on EOS token
            outputTokens.push(nextToken);
        }
        
        // Convert token IDs back to text (simplified)
        return outputTokens.map(t => `[Token${t}]`).join(' ');
        
    } catch (error) {
        console.error('Error during inference:', error);
        throw error;
    }
}

// Handle messages from main thread
self.onmessage = async (e) => {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'init':
                await initModel();
                self.postMessage({ type: 'status', data: 'Model loaded' });
                break;
                
            case 'generate':
                const response = await generateResponse(data);
                self.postMessage({ 
                    type: 'response', 
                    data: response,
                    requestId: e.data.requestId
                });
                break;
                
            default:
                console.warn('Unknown message type:', type);
        }
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            error: error.message,
            requestId: e.data.requestId
        });
    }
};
