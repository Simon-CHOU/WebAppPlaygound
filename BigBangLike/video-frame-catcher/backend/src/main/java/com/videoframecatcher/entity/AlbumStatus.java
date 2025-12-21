package com.videoframecatcher.entity;

public enum AlbumStatus {
    PROCESSING("processing"),
    COMPLETED("completed"),
    FAILED("failed");

    private final String value;

    AlbumStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AlbumStatus fromValue(String value) {
        for (AlbumStatus status : AlbumStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown album status: " + value);
    }
}