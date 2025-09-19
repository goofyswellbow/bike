import Stats from 'three/examples/jsm/libs/stats.module.js';

// Performance Monitoring Setup
const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.left = '0px';
document.body.appendChild(stats.dom);

// Custom performance tracking
const PERFORMANCE_HISTORY_LENGTH = 100;
const performanceMetrics = {
    frameTimings: new Array(PERFORMANCE_HISTORY_LENGTH).fill(0),
    updateTimings: new Array(PERFORMANCE_HISTORY_LENGTH).fill(0),
    memoryUsage: new Array(PERFORMANCE_HISTORY_LENGTH).fill(0),
    currentIndex: 0
};

function trackOperation(name, operation) {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    console.log(`${name} took ${duration.toFixed(2)}ms`);
    return result;
}

function updatePerformanceMetrics(updateTime) {
    // Store metrics
    performanceMetrics.frameTimings[performanceMetrics.currentIndex] = 1000 / stats.fps;
    performanceMetrics.updateTimings[performanceMetrics.currentIndex] = updateTime;
    performanceMetrics.memoryUsage[performanceMetrics.currentIndex] =
        performance.memory?.usedJSHeapSize || 0;

    performanceMetrics.currentIndex =
        (performanceMetrics.currentIndex + 1) % PERFORMANCE_HISTORY_LENGTH;
}

function generatePerformanceReport() {
    const metrics = {
        avgFrameTime: average(performanceMetrics.frameTimings),
        avgUpdateTime: average(performanceMetrics.updateTimings),
        maxUpdateTime: Math.max(...performanceMetrics.updateTimings),
        avgMemory: average(performanceMetrics.memoryUsage) / 1024 / 1024,
        fps: stats.fps
    };

    console.table(metrics);
    return metrics;
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Add keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'P' && e.ctrlKey) {
        generatePerformanceReport();
    }
});

export { 
    stats,
    trackOperation,
    updatePerformanceMetrics,
    generatePerformanceReport
};