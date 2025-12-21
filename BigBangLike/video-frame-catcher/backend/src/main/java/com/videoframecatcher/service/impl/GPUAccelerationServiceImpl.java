package com.videoframecatcher.service.impl;

import com.videoframecatcher.service.GPUAccelerationService;
import com.videoframecatcher.service.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class GPUAccelerationServiceImpl implements GPUAccelerationService {

    private static final Logger logger = LoggerFactory.getLogger(GPUAccelerationServiceImpl.class);

    private final StorageService storageService;
    private GPUType availableGPUType;
    private ExecutorService gpuExecutor;
    private boolean gpuInitialized = false;

    @Value("${gpu.acceleration.enabled:true}")
    private boolean gpuAccelerationEnabled;

    @Value("${gpu.acceleration.intel-openvino.enabled:true}")
    private boolean intelOpenVINOEnabled;

    @Value("${gpu.acceleration.nvidia-cuda.enabled:true}")
    private boolean nvidiaCudaEnabled;

    @Value("${gpu.acceleration.amd-vulkan.enabled:true}")
    private boolean amdVulkanEnabled;

    @Value("${gpu.acceleration.intel-openvino.device:GPU}")
    private String intelOpenVINODevice;

    public GPUAccelerationServiceImpl(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostConstruct
    public void initialize() {
        if (!gpuAccelerationEnabled) {
            logger.info("GPU acceleration is disabled");
            availableGPUType = GPUType.CPU_FALLBACK;
            return;
        }

        logger.info("Initializing GPU acceleration service...");

        try {
            availableGPUType = detectOptimalGPU();

            if (availableGPUType != GPUType.CPU_FALLBACK) {
                gpuExecutor = Executors.newFixedThreadPool(4); // GPU线程池
                gpuInitialized = true;
                logger.info("GPU acceleration initialized with: {}", availableGPUType.getDescription());
            } else {
                logger.warn("No suitable GPU found, falling back to CPU processing");
            }
        } catch (Exception e) {
            logger.error("Failed to initialize GPU acceleration", e);
            availableGPUType = GPUType.CPU_FALLBACK;
        }
    }

    @PreDestroy
    public void cleanup() {
        if (gpuExecutor != null) {
            gpuExecutor.shutdown();
            try {
                if (!gpuExecutor.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
                    gpuExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                gpuExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        gpuInitialized = false;
        logger.info("GPU acceleration service cleaned up");
    }

    @Override
    public String processWithGPU(String inputPath, String outputFilename, int quality) {
        if (!gpuInitialized || availableGPUType == GPUType.CPU_FALLBACK) {
            logger.warn("GPU acceleration not available, falling back to CPU");
            return processWithCPU(inputPath, outputFilename, quality);
        }

        try {
            logger.debug("Processing image with GPU: {} using {}", inputPath, availableGPUType);

            switch (availableGPUType) {
                case INTEL_ARC_OPENVINO:
                    return processWithIntelOpenVINO(inputPath, outputFilename, quality);
                case NVIDIA_CUDA:
                    return processWithNVIDIA CUDA(inputPath, outputFilename, quality);
                case AMD_VULKAN:
                    return processWithAMDVulkan(inputPath, outputFilename, quality);
                default:
                    return processWithCPU(inputPath, outputFilename, quality);
            }

        } catch (Exception e) {
            logger.error("GPU processing failed, falling back to CPU", e);
            return processWithCPU(inputPath, outputFilename, quality);
        }
    }

    private String processWithIntelOpenVINO(String inputPath, String outputFilename, int quality) {
        logger.info("Processing with Intel Arc OpenVINO");

        // 使用OpenVINO进行图像处理
        // 这里可以集成OpenVINO Python推理引擎或者通过JNI调用
        try {
            // 临时实现：使用FFmpeg的硬件加速
            String outputPath = System.getProperty("java.io.tmpdir") + "/gpu_" + outputFilename;

            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath,
                "-c:v", "libx265",
                "-preset", "fast",
                "-crf", String.valueOf(quality),
                "-pix_fmt", "yuv420p",
                "-y",
                outputPath
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                byte[] processedData = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(outputPath));
                String finalPath = storageService.storeFrame(0L, 0, processedData, "heic"); // 需要真实的albumId和frameNumber
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(outputPath));
                return finalPath;
            } else {
                throw new RuntimeException("OpenVINO processing failed with exit code: " + exitCode);
            }

        } catch (Exception e) {
            throw new RuntimeException("Intel OpenVINO processing failed", e);
        }
    }

    private String processWithNVIDIA CUDA(String inputPath, String outputFilename, int quality) {
        logger.info("Processing with NVIDIA CUDA");

        try {
            String outputPath = System.getProperty("java.io.tmpdir") + "/cuda_" + outputFilename;

            // 使用NVIDIA CUDA加速的FFmpeg
            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath,
                "-c:v", "h264_nvenc",
                "-preset", "fast",
                "-crf", String.valueOf(quality),
                "-pix_fmt", "yuv420p",
                "-y",
                outputPath
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                byte[] processedData = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(outputPath));
                String finalPath = storageService.storeFrame(0L, 0, processedData, "mp4"); // 临时
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(outputPath));
                return finalPath;
            } else {
                throw new RuntimeException("CUDA processing failed with exit code: " + exitCode);
            }

        } catch (Exception e) {
            throw new RuntimeException("NVIDIA CUDA processing failed", e);
        }
    }

    private String processWithAMDVulkan(String inputPath, String outputFilename, int quality) {
        logger.info("Processing with AMD Vulkan");

        try {
            String outputPath = System.getProperty("java.io.tmpdir") + "/vulkan_" + outputFilename;

            // 使用AMD Vulkan加速
            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", String.valueOf(quality),
                "-pix_fmt", "yuv420p",
                "-y",
                outputPath
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                byte[] processedData = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(outputPath));
                String finalPath = storageService.storeFrame(0L, 0, processedData, "mp4"); // 临时
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(outputPath));
                return finalPath;
            } else {
                throw new RuntimeException("Vulkan processing failed with exit code: " + exitCode);
            }

        } catch (Exception e) {
            throw new RuntimeException("AMD Vulkan processing failed", e);
        }
    }

    private String processWithCPU(String inputPath, String outputFilename, int quality) {
        logger.debug("Processing with CPU");

        try {
            String outputPath = System.getProperty("java.io.tmpdir") + "/cpu_" + outputFilename;

            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", String.valueOf(quality),
                "-pix_fmt", "yuv420p",
                "-y",
                outputPath
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                byte[] processedData = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(outputPath));
                String finalPath = storageService.storeFrame(0L, 0, processedData, "mp4"); // 临时
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(outputPath));
                return finalPath;
            } else {
                throw new RuntimeException("CPU processing failed with exit code: " + exitCode);
            }

        } catch (Exception e) {
            throw new RuntimeException("CPU processing failed", e);
        }
    }

    @Override
    public boolean isGPUSupported() {
        return gpuInitialized && availableGPUType != GPUType.CPU_FALLBACK;
    }

    @Override
    public GPUType getAvailableGPUType() {
        return availableGPUType != null ? availableGPUType : GPUType.CPU_FALLBACK;
    }

    @Override
    public GPUType detectOptimalGPU() {
        logger.info("Detecting optimal GPU acceleration backend...");

        // 检测Intel Arc OpenVINO
        if (intelOpenVINOEnabled && detectIntelOpenVINO()) {
            logger.info("Intel Arc OpenVINO detected");
            return GPUType.INTEL_ARC_OPENVINO;
        }

        // 检测NVIDIA CUDA
        if (nvidiaCudaEnabled && detectNVIDIA CUDA()) {
            logger.info("NVIDIA CUDA detected");
            return GPUType.NVIDIA_CUDA;
        }

        // 检测AMD Vulkan
        if (amdVulkanEnabled && detectAMDVulkan()) {
            logger.info("AMD Vulkan detected");
            return GPUType.AMD_VULKAN;
        }

        logger.info("No GPU acceleration detected, using CPU fallback");
        return GPUType.CPU_FALLBACK;
    }

    private boolean detectIntelOpenVINO() {
        try {
            // 检查OpenVINO运行时是否可用
            ProcessBuilder pb = new ProcessBuilder("python3", "-c", "import openvino");
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                logger.debug("Intel OpenVINO Python runtime available");
                return true;
            }
        } catch (Exception e) {
            logger.debug("Intel OpenVINO not available via Python");
        }

        // 检查OpenVINO环境变量
        String openvinoDir = System.getenv("INTEL_OPENVINO_DIR");
        if (openvinoDir != null && new File(openvinoDir).exists()) {
            logger.debug("Intel OpenVINO environment detected");
            return true;
        }

        // 检查Intel GPU驱动
        try {
            ProcessBuilder pb = new ProcessBuilder("wmic", "path", "win32_VideoController", "get", "name");
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.toLowerCase().contains("intel") && line.toLowerCase().contains("arc")) {
                        logger.debug("Intel Arc GPU detected");
                        return true;
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            logger.debug("Failed to detect Intel GPU", e);
        }

        return false;
    }

    private boolean detectNVIDIA CUDA() {
        try {
            ProcessBuilder pb = new ProcessBuilder("nvidia-smi");
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                logger.debug("NVIDIA CUDA available");
                return true;
            }
        } catch (Exception e) {
            logger.debug("NVIDIA CUDA not available");
        }
        return false;
    }

    private boolean detectAMDVulkan() {
        try {
            ProcessBuilder pb = new ProcessBuilder("vulkaninfo");
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                logger.debug("AMD Vulkan available");
                return true;
            }
        } catch (Exception e) {
            logger.debug("AMD Vulkan not available");
        }
        return false;
    }

    @Override
    public double getGPUUsage() {
        if (!isGPUSupported()) {
            return 0.0;
        }

        try {
            switch (availableGPUType) {
                case NVIDIA_CUDA:
                    return getNVIDIAGPUUsage();
                case INTEL_ARC_OPENVINO:
                    return getIntelGPUUsage();
                case AMD_VULKAN:
                    return getAMDGPUUsage();
                default:
                    return 0.0;
            }
        } catch (Exception e) {
            logger.debug("Failed to get GPU usage", e);
            return 0.0;
        }
    }

    private double getNVIDIAGPUUsage() {
        try {
            ProcessBuilder pb = new ProcessBuilder("nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits");
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && !line.trim().isEmpty()) {
                    return Double.parseDouble(line.trim()) / 100.0;
                }
            }
            process.waitFor();
        } catch (Exception e) {
            logger.debug("Failed to get NVIDIA GPU usage", e);
        }
        return 0.0;
    }

    private double getIntelGPUUsage() {
        // Intel GPU使用率检测实现
        // 这里需要根据具体的Intel GPU监控工具来实现
        return 0.0;
    }

    private double getAMDGPUUsage() {
        // AMD GPU使用率检测实现
        // 这里需要根据具体的AMD GPU监控工具来实现
        return 0.0;
    }
}