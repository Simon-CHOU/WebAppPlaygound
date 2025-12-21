package com.videoframecatcher.service;

public interface GPUAccelerationService {

    /**
     * 使用GPU处理图像
     * @param inputPath 输入文件路径
     * @param outputFilename 输出文件名
     * @param quality 质量参数
     * @return 处理后的文件路径
     */
    String processWithGPU(String inputPath, String outputFilename, int quality);

    /**
     * 检查GPU是否支持
     * @return 是否支持GPU加速
     */
    boolean isGPUSupported();

    /**
     * 获取可用的GPU类型
     * @return GPU类型
     */
    GPUType getAvailableGPUType();

    /**
     * 检测最优的GPU加速后端
     * @return 最优的GPU类型
     */
    GPUType detectOptimalGPU();

    /**
     * 获取GPU使用率
     * @return GPU使用率 (0.0 - 1.0)
     */
    double getGPUUsage();

    /**
     * 初始化GPU加速服务
     */
    void initialize();

    /**
     * 清理GPU资源
     */
    void cleanup();

    enum GPUType {
        INTEL_ARC_OPENVINO("Intel Arc OpenVINO"),
        NVIDIA_CUDA("NVIDIA CUDA"),
        AMD_VULKAN("AMD Vulkan"),
        CPU_FALLBACK("CPU Fallback");

        private final String description;

        GPUType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}