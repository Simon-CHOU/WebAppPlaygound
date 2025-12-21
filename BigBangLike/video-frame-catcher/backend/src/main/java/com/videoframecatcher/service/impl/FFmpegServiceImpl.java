package com.videoframecatcher.service.impl;

import com.videoframecatcher.service.FFmpegService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FFmpegServiceImpl implements FFmpegService {

    private static final Logger logger = LoggerFactory.getLogger(FFmpegServiceImpl.class);

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${ffmpeg.ffprobe-path:ffprobe}")
    private String ffprobePath;

    // 视频信息解析正则表达式
    private static final Pattern DURATION_PATTERN = Pattern.compile(
        "Duration: (\\d{2}):(\\d{2}):(\\d{2})\\.(\\d{2})"
    );
    private static final Pattern FRAME_RATE_PATTERN = Pattern.compile(
        "(\\d+(?:\\.\\d+)?) fps"
    );
    private static final Pattern DIMENSIONS_PATTERN = Pattern.compile(
        "(\\d{3,4})x(\\d{3,4})"
    );

    @Override
    public VideoMetadata extractMetadata(String videoPath) {
        try {
            logger.info("Extracting metadata from video: {}", videoPath);

            List<String> command = List.of(
                ffprobePath,
                "-v", "error",
                "-show_entries", "stream=width,height,r_frame_rate,duration,codec_name",
                "-show_entries", "format=duration,size",
                "-of", "default=noprint_wrappers=1:nokey=1",
                videoPath
            );

            ProcessResult result = executeCommand(command);

            if (result.getExitCode() != 0) {
                throw new RuntimeException("Failed to extract video metadata: " + result.getError());
            }

            String output = result.getOutput();
            logger.debug("FFprobe output: {}", output);

            return parseMetadata(output);

        } catch (Exception e) {
            logger.error("Failed to extract metadata from video: {}", videoPath, e);
            throw new RuntimeException("Failed to extract video metadata", e);
        }
    }

    @Override
    public List<String> extractFrames(String videoPath, String outputPattern, double framesPerSecond) {
        try {
            logger.info("Extracting frames from video: {} at {} fps", videoPath, framesPerSecond);

            List<String> command = new ArrayList<>();
            command.add(ffmpegPath);
            command.add("-i");
            command.add(videoPath);
            command.add("-vf");
            command.add(String.format("fps=%s", framesPerSecond));
            command.add("-q:v");
            command.add("2"); // 高质量
            command.add("-y"); // 覆盖现有文件
            command.add(outputPattern);

            ProcessResult result = executeCommand(command);

            if (result.getExitCode() != 0) {
                throw new RuntimeException("Failed to extract frames: " + result.getError());
            }

            logger.info("Frame extraction completed successfully");
            return result.getOutputLines();

        } catch (Exception e) {
            logger.error("Failed to extract frames from video: {}", videoPath, e);
            throw new RuntimeException("Failed to extract frames", e);
        }
    }

    @Override
    public boolean convertToHEIC(String inputPath, String outputPath, int quality) {
        try {
            logger.info("Converting image to HEIC: {} -> {}", inputPath, outputPath);

            List<String> command = List.of(
                ffmpegPath,
                "-i", inputPath,
                "-c:v", "libx265",
                "-preset", "medium",
                "-crf", String.valueOf(quality),
                "-pix_fmt", "yuv420p",
                "-y",
                outputPath
            );

            ProcessResult result = executeCommand(command);

            if (result.getExitCode() != 0) {
                logger.error("Failed to convert to HEIC: {}", result.getError());
                return false;
            }

            logger.info("HEIC conversion completed successfully");
            return true;

        } catch (Exception e) {
            logger.error("Failed to convert image to HEIC: {}", inputPath, e);
            return false;
        }
    }

    @Override
    public boolean generateThumbnail(String inputPath, String outputPath, int width, int height, int quality) {
        try {
            logger.info("Generating thumbnail: {} -> {}", inputPath, outputPath);

            List<String> command = List.of(
                ffmpegPath,
                "-i", inputPath,
                "-vf", String.format("scale=%d:%d:force_original_aspect_ratio=decrease", width, height),
                "-q:v", String.valueOf(quality),
                "-frames:v", "1",
                "-y",
                outputPath
            );

            ProcessResult result = executeCommand(command);

            if (result.getExitCode() != 0) {
                logger.error("Failed to generate thumbnail: {}", result.getError());
                return false;
            }

            logger.info("Thumbnail generation completed successfully");
            return true;

        } catch (Exception e) {
            logger.error("Failed to generate thumbnail: {}", inputPath, e);
            return false;
        }
    }

    @Override
    public boolean validateVideoFile(String videoPath) {
        try {
            logger.info("Validating video file: {}", videoPath);

            List<String> command = List.of(
                ffprobePath,
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                videoPath
            );

            ProcessResult result = executeCommand(command);

            if (result.getExitCode() != 0) {
                logger.error("Video validation failed: {}", result.getError());
                return false;
            }

            String output = result.getOutput().trim();
            if (output.isEmpty()) {
                logger.error("Video validation failed: No duration information");
                return false;
            }

            double duration = Double.parseDouble(output);
            return duration > 0;

        } catch (Exception e) {
            logger.error("Failed to validate video file: {}", videoPath, e);
            return false;
        }
    }

    @Override
    public ProcessResult executeCommand(List<String> command) throws IOException, InterruptedException {
        logger.debug("Executing command: {}", String.join(" ", command));

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(false);

        Process process = processBuilder.start();

        // 读取输出
        StringBuilder output = new StringBuilder();
        StringBuilder error = new StringBuilder();
        List<String> outputLines = new ArrayList<>();

        try (BufferedReader outputReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
             BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {

            String line;
            while ((line = outputReader.readLine()) != null) {
                output.append(line).append("\n");
                outputLines.add(line);
            }

            while ((line = errorReader.readLine()) != null) {
                error.append(line).append("\n");
            }
        }

        int exitCode = process.waitFor();

        ProcessResult result = new ProcessResult();
        result.setExitCode(exitCode);
        result.setOutput(output.toString());
        result.setError(error.toString());
        result.setOutputLines(outputLines);

        logger.debug("Command completed with exit code: {}", exitCode);
        if (exitCode != 0) {
            logger.error("Command error output: {}", error.toString());
        }

        return result;
    }

    private VideoMetadata parseMetadata(String ffprobeOutput) {
        VideoMetadata metadata = new VideoMetadata();

        String[] lines = ffprobeOutput.split("\n");

        // 解析视频流信息
        for (String line : lines) {
            line = line.trim();

            if (line.contains("Duration:")) {
                Matcher matcher = DURATION_PATTERN.matcher(line);
                if (matcher.find()) {
                    int hours = Integer.parseInt(matcher.group(1));
                    int minutes = Integer.parseInt(matcher.group(2));
                    int seconds = Integer.parseInt(matcher.group(3));
                    int centiseconds = Integer.parseInt(matcher.group(4));

                    double totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100.0;
                    metadata.setDuration(BigDecimal.valueOf(totalSeconds).setScale(3, RoundingMode.HALF_UP));
                }
            }

            if (line.contains("fps")) {
                Matcher matcher = FRAME_RATE_PATTERN.matcher(line);
                if (matcher.find()) {
                    double frameRate = Double.parseDouble(matcher.group(1));
                    metadata.setFrameRate((int) Math.round(frameRate));
                }
            }

            if (line.matches("\\d{3,4}x\\d{3,4}")) {
                Matcher matcher = DIMENSIONS_PATTERN.matcher(line);
                if (matcher.find()) {
                    metadata.setWidth(Integer.parseInt(matcher.group(1)));
                    metadata.setHeight(Integer.parseInt(matcher.group(2)));
                }
            }

            if (line.startsWith("h264") || line.startsWith("h265") || line.startsWith("avc1")) {
                metadata.setVideoCodec(line.trim());
            }
        }

        return metadata;
    }

    public static class VideoMetadata {
        private BigDecimal duration;
        private Integer frameRate;
        private Integer width;
        private Integer height;
        private String videoCodec;
        private Long fileSize;

        // Getters and Setters
        public BigDecimal getDuration() { return duration; }
        public void setDuration(BigDecimal duration) { this.duration = duration; }

        public Integer getFrameRate() { return frameRate; }
        public void setFrameRate(Integer frameRate) { this.frameRate = frameRate; }

        public Integer getWidth() { return width; }
        public void setWidth(Integer width) { this.width = width; }

        public Integer getHeight() { return height; }
        public void setHeight(Integer height) { this.height = height; }

        public String getVideoCodec() { return videoCodec; }
        public void setVideoCodec(String videoCodec) { this.videoCodec = videoCodec; }

        public Long getFileSize() { return fileSize; }
        public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    }

    public static class ProcessResult {
        private int exitCode;
        private String output;
        private String error;
        private List<String> outputLines;

        // Getters and Setters
        public int getExitCode() { return exitCode; }
        public void setExitCode(int exitCode) { this.exitCode = exitCode; }

        public String getOutput() { return output; }
        public void setOutput(String output) { this.output = output; }

        public String getError() { return error; }
        public void setError(String error) { this.error = error; }

        public List<String> getOutputLines() { return outputLines; }
        public void setOutputLines(List<String> outputLines) { this.outputLines = outputLines; }
    }
}