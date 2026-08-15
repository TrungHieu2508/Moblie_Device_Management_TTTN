package com.edusphere.mdmserver.domain.school.job;

import com.edusphere.mdmserver.domain.school.service.ClassSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClassSessionScheduler {

    private final ClassSessionService classSessionService;

    // Run every minute
    @Scheduled(cron = "0 * * * * *")
    public void scheduleClassSessions() {
        log.info("Running ClassSession Auto-Management Job...");
        classSessionService.autoManageSessions();
    }
}
