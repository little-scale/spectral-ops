/**
 * FFT Operations Module
 * Implements various operations on FFT magnitude bins
 */

// Helper functions to avoid slow spread operators
function findMax(arr) {
    let max = arr[0] || 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

function findMin(arr) {
    let min = arr[0] || 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
    }
    return min;
}

const FFTOperations = {
    /**
     * AND operation: min(magA, magB)
     * Extracts common spectral content
     */
    and: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = Math.min(magA[i], magB[i]);
        }
        return result;
    },

    /**
     * OR operation: max(magA, magB)
     * Combines spectral content
     */
    or: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = Math.max(magA[i], magB[i]);
        }
        return result;
    },

    /**
     * XOR operation: |magA - magB|
     * Extracts spectral differences
     */
    xor: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = Math.abs(magA[i] - magB[i]);
        }
        return result;
    },

    /**
     * Multiply operation: magA * magB
     * Emphasizes shared frequencies
     */
    multiply: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = magA[i] * magB[i];
        }
        return result;
    },

    /**
     * Average operation: (magA + magB) / 2
     * Blends spectral content
     */
    average: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = (magA[i] + magB[i]) / 2;
        }
        return result;
    },

    /**
     * NOT A operation: max(magA) - magA + min(magB)
     * Inverts A's spectrum, uses B as reference
     */
    notA: (magA, magB) => {
        const maxA = findMax(magA);
        const minB = findMin(magB);
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = maxA - magA[i] + minB;
        }
        return result;
    },

    /**
     * NOT B operation: max(magB) - magB + min(magA)
     * Inverts B's spectrum, uses A as reference
     */
    notB: (magA, magB) => {
        const maxB = findMax(magB);
        const minA = findMin(magA);
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = maxB - magB[i] + minA;
        }
        return result;
    },

    /**
     * A Squared operation: magA^2
     * Enhances A's harmonics
     */
    aSquared: (magA, magB) => {
        const result = new Float32Array(magA.length);
        const maxA = findMax(magA);
        // Normalize to prevent overflow
        for (let i = 0; i < magA.length; i++) {
            const normalized = magA[i] / (maxA || 1);
            result[i] = normalized * normalized * maxA;
        }
        return result;
    },

    /**
     * B Squared operation: magB^2
     * Enhances B's harmonics
     */
    bSquared: (magA, magB) => {
        const result = new Float32Array(magA.length);
        const maxB = findMax(magB);
        // Normalize to prevent overflow
        for (let i = 0; i < magA.length; i++) {
            const normalized = magB[i] / (maxB || 1);
            result[i] = normalized * normalized * maxB;
        }
        return result;
    },

    /**
     * Subtract operation: max(0, magA - magB)
     * Extracts A's unique content
     */
    subtract: (magA, magB) => {
        const result = new Float32Array(magA.length);
        for (let i = 0; i < magA.length; i++) {
            result[i] = Math.max(0, magA[i] - magB[i]);
        }
        return result;
    },

    /**
     * Apply selected operation to magnitude arrays
     * @param {string} operation - Operation name
     * @param {Float32Array} magA - Magnitude array from audio A
     * @param {Float32Array} magB - Magnitude array from audio B
     * @returns {Float32Array} Resulting magnitude array
     */
    apply: (operation, magA, magB) => {
        if (!FFTOperations[operation]) {
            console.error(`Unknown operation: ${operation}`);
            return FFTOperations.average(magA, magB);
        }
        const result = FFTOperations[operation](magA, magB);

        // Log first call for debugging
        if (!FFTOperations._logged) {
            FFTOperations._logged = true;
            // Sample some values for debugging
            const sampleIdx = Math.floor(magA.length / 4); // Low-mid frequency
            console.log(`Operation "${operation}" sample at bin ${sampleIdx}:`);
            console.log(`  A: ${magA[sampleIdx].toFixed(4)}, B: ${magB[sampleIdx].toFixed(4)}, Result: ${result[sampleIdx].toFixed(4)}`);
        }

        return result;
    },

    // Reset log flag when starting new processing
    resetLog: () => {
        FFTOperations._logged = false;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FFTOperations;
}
