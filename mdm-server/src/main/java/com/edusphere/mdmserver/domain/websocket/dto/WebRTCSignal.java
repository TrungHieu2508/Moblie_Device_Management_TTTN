package com.edusphere.mdmserver.domain.websocket.dto;

import lombok.Data;

@Data
public class WebRTCSignal {
    private String targetId; // can be "admin" or deviceId
    private String senderId; // the ID of whoever is sending this signal
    private SignalType type;
    private String sdp;
    private Candidate candidate;

    public enum SignalType {
        OFFER,
        ANSWER,
        ICE_CANDIDATE
    }

    @Data
    public static class Candidate {
        private String candidate;
        private String sdpMid;
        private Integer sdpMLineIndex;
    }
}
