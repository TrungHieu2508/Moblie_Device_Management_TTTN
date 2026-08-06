package com.edusphere.mdmserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * EduGuardian MDM Server
 * Mobile Device Management for Educational Environments
 */
@SpringBootApplication
@EnableScheduling
public class MdmServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(MdmServerApplication.class, args);
    }
}
