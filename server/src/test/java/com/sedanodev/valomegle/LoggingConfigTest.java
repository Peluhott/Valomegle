package com.sedanodev.valomegle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.classic.util.ContextInitializer;
import ch.qos.logback.core.status.Status;

/**
 * Applies {@code logback-spring.xml} to the logging context (no Spring) and checks that an ERROR
 * lands in a date-labelled {@code logs/error-YYYY-MM-DD.log} while lower levels do not.
 */
class LoggingConfigTest {

    @AfterEach
    void restoreDefaultLogging() throws Exception {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        context.reset();
        new ContextInitializer(context).autoConfig();
    }

    @Test
    void errorsGoToDatedFileLowerLevelsDoNot() throws Exception {
        Path errorFile = Path.of("logs", "error-" + LocalDate.now() + ".log");
        Files.deleteIfExists(errorFile);

        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        context.reset();
        // Spring Boot normally injects this; supply it so the imported file-appender resolves.
        context.putProperty("LOG_FILE", "logs/valomegle.log");

        JoranConfigurator configurator = new JoranConfigurator();
        configurator.setContext(context);
        configurator.doConfigure(getClass().getResource("/logback-spring.xml"));

        long configErrors = context.getStatusManager().getCopyOfStatusList().stream()
                .filter(s -> s.getLevel() == Status.ERROR)
                .count();
        assertEquals(0, configErrors, "logback-spring.xml produced configuration errors");

        org.slf4j.Logger log = LoggerFactory.getLogger("com.sedanodev.valomegle.LoggingConfigTest");
        log.info("info line - marker INFO");
        log.error("error line - marker ERROR");

        // Stop so every appender flushes and closes before we read the files.
        context.stop();

        assertTrue(Files.exists(errorFile), "the dated error file should exist");
        String contents = Files.readString(errorFile);
        assertTrue(contents.contains("marker ERROR"), "error file should contain the ERROR message");
        assertFalse(contents.contains("marker INFO"), "error file should be filtered to ERROR and above");
    }
}
