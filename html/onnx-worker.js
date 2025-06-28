// Import ONNX Runtime Web using dynamic import
let ort;
let session = null;
const modelUrl = 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/onnx/model.onnx';

// Cache name for IndexedDB
const CACHE_NAME = 'onnx-model-cache';

// Initialize ONNX Runtime
async function initONNX() {
    try {
        // Import ONNX Runtime Web
        ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
        return { status: 'ready' };
    } catch (error) {
        console.error('Failed to load ONNX Runtime:', error);
        throw error;
    }
}

// Initialize the model
async function initModel() {
    if (!ort) {
        throw new Error('ONNX Runtime not initialized');
    }

    try {
        console.log('Initializing model...');
        
        // Try to load from cache first
        const cachedModel = await getCachedModel();
        
        if (cachedModel) {
            console.log('Loading model from cache...');
            session = await ort.InferenceSession.create(cachedModel.buffer, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });
        } else {
            console.log('Downloading model...');
            const response = await fetch(modelUrl);
            if (!response.ok) throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Cache the model
            await cacheModel(arrayBuffer);
            
            // Create session with optimized settings
            console.log('Creating inference session...');
            session = await ort.InferenceSession.create(arrayBuffer, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });
        }
        
        console.log('Model initialized successfully');
        return { status: 'ready' };
    } catch (error) {
        console.error('Error initializing model:', error);
        throw new Error(`Model initialization failed: ${error.message}`);
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
    
    if (!inputText || typeof inputText !== 'string') {
        throw new Error('Invalid input: Expected a string');
    }
    
    console.log('Generating response for input:', inputText.substring(0, 100) + (inputText.length > 100 ? '...' : ''));
    
    try {
        // Simple tokenization (replace with actual tokenizer)
        const tokens = inputText.toLowerCase()
            .replace(/[^\w\s]/g, '')  // Remove punctuation
            .split(/\s+/)
            .filter(t => t.length > 0);
            
        if (tokens.length === 0) {
            throw new Error('No valid tokens in input');
        }
        
        // Convert tokens to token IDs (placeholder)
        const inputIds = new Int32Array(tokens.map((_, i) => (i % 1000) + 1));
        const attentionMask = new Int32Array(inputIds.length).fill(1);
        
        console.log(`Running inference with ${inputIds.length} tokens...`);
        
        // Prepare model inputs
        const inputs = {
            input_ids: new ort.Tensor('int32', inputIds, [1, inputIds.length]),
            attention_mask: new ort.Tensor('int32', attentionMask, [1, inputIds.length]),
            // Add any additional required inputs for your model
        };
        
        // Run inference with timing
        const startTime = performance.now();
        const results = await session.run(inputs);
        const inferenceTime = ((performance.now() - startTime) / 1000).toFixed(2);
        
        console.log(`Inference completed in ${inferenceTime}s`);
        
        // Process output - adjust based on your model's output format
        const output = results.logits || results.output_logits;
        if (!output) {
            throw new Error('No output from model');
        }
        
        // Simple greedy decoding (replace with actual decoding logic)
        const outputTokens = [];
        const maxLength = Math.min(50, output.dims[1] || 50);
        
        for (let i = 0; i < maxLength; i++) {
            const logits = output.data.slice(i * output.dims[2], (i + 1) * output.dims[2]);
            const nextToken = logits.indexOf(Math.max(...logits));
            
            // Stop on EOS token or if we've reached the maximum length
            if (nextToken === 0 || nextToken === -1) break;
            
            outputTokens.push(nextToken);
        }
        
        // Convert token IDs back to text (placeholder)
        const responseText = outputTokens.length > 0 
            ? `[Generated ${outputTokens.length} tokens: ${outputTokens.join(' ')}]`
            : "I'm not sure how to respond to that.";
        
        console.log('Generated response:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
        return responseText;
        
    } catch (error) {
        console.error('Error during inference:', error);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
}

// Flag to track if ONNX is initialized
let isONNXInitialized = false;

// Handle messages from main thread
self.onmessage = async (e) => {
    const { type, data, requestId } = e.data;
    
    try {
        // Initialize ONNX Runtime if not already done
        if (!isONNXInitialized) {
            await initONNX();
            isONNXInitialized = true;
        }
        
        switch (type) {
            case 'init':
                await initModel();
                self.postMessage({ 
                    type: 'status', 
                    data: 'Model loaded',
                    requestId
                });
                break;
                
            case 'generate':
                const response = await generateResponse(data);
                self.postMessage({ 
                    type: 'response', 
                    data: response,
                    requestId
                });
                break;
                
            default:
                console.warn('Unknown message type:', type);
                self.postMessage({
                    type: 'error',
                    error: `Unknown message type: ${type}`,
                    requestId
                });
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ 
            type: 'error', 
            error: error.message,
            requestId
        });
    }
};

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection in worker:', event.reason);
    self.postMessage({
        type: 'error',
        error: event.reason?.message || 'Unknown error in worker',
        requestId: null
    });
});
