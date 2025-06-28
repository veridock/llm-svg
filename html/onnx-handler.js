class ONNXModelHandler {
    constructor() {
        this.session = null;
        this.tokenizer = null;
        this.isInitialized = false;
        this.modelUrl = 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/onnx/model.onnx';
        this.cacheName = 'onnx-model-cache';
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Initialize ONNX Runtime
            this.ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
            
            // Try to load from cache first
            const cachedModel = await this.loadFromCache();
            
            if (cachedModel) {
                console.log('Loading model from cache...');
                this.session = await this.ort.InferenceSession.create(cachedModel);
            } else {
                console.log('Downloading model...');
                const response = await fetch(this.modelUrl);
                if (!response.ok) throw new Error('Failed to download model');
                
                const arrayBuffer = await response.arrayBuffer();
                this.session = await this.ort.InferenceSession.create(arrayBuffer);
                
                // Cache the model for future use
                await this.saveToCache(arrayBuffer);
            }
            
            this.isInitialized = true;
            return true;
            
        } catch (error) {
            console.error('Error initializing ONNX model:', error);
            throw error;
        }
    }

    async loadFromCache() {
        try {
            if (!('caches' in window)) return null;
            
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(this.modelUrl);
            
            if (!response) return null;
            
            return await response.arrayBuffer();
        } catch (error) {
            console.warn('Cache read failed:', error);
            return null;
        }
    }

    async saveToCache(arrayBuffer) {
        try {
            if (!('caches' in window)) return;
            
            const cache = await caches.open(this.cacheName);
            const response = new Response(arrayBuffer, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });
            
            await cache.put(this.modelUrl, response);
        } catch (error) {
            console.warn('Cache write failed:', error);
        }
    }

    // Simple tokenizer (replace with actual tokenizer for the model)
    tokenize(text) {
        // This is a simplified tokenizer - replace with actual tokenizer for your model
        return text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    }

    // Generate response using the ONNX model
    async generateResponse(prompt, maxLength = 50) {
        if (!this.isInitialized) {
            throw new Error('Model not initialized');
        }

        try {
            // Prepare input tensors
            const tokens = this.tokenize(prompt);
            const inputIds = new Int32Array(tokens.map((_, i) => i + 1)); // Simple token mapping
            
            // Create input tensor
            const inputTensor = new this.ort.Tensor('int32', inputIds, [1, inputIds.length]);
            
            // Run inference
            const feeds = { 
                input_ids: inputTensor,
                attention_mask: new this.ort.Tensor('int32', new Int32Array(inputIds.length).fill(1), [1, inputIds.length])
            };
            
            const results = await this.session.run(feeds);
            
            // Process output (simplified - adjust based on actual model output)
            const output = results.logits || results.output_logits;
            const outputTokens = [];
            
            // Simple greedy decoding (replace with proper decoding for your model)
            for (let i = 0; i < maxLength; i++) {
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
}

// Export as a singleton
export const onnxModel = new ONNXModelHandler();
