package com.ironedge;

import java.awt.Desktop;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

public class DesktopAppLauncher {

    private static final int DESKTOP_PORT = 58080;

    private static boolean isAppAlreadyRunning(String url) {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(700);
            conn.setReadTimeout(700);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            return code >= 200 && code < 500;
        } catch (Exception ex) {
            return false;
        }
    }

    private static void openBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().browse(new URI(url));
            } else {
                System.out.println("Abra no navegador: " + url);
            }
        } catch (Exception ex) {
            System.out.println("Nao foi possivel abrir o navegador automaticamente.");
            System.out.println("Abra no navegador: " + url);
        }
    }

    public static void main(String[] args) {
        String url = "http://localhost:" + DESKTOP_PORT + "/index.html";
        if (isAppAlreadyRunning(url)) {
            openBrowser(url);
            return;
        }

        String desktopDbPath = "jdbc:h2:file:" + System.getProperty("user.home").replace("\\", "/")
                + "/.ironedge/data/ironedge-desktop;MODE=PostgreSQL;DB_CLOSE_ON_EXIT=FALSE;FILE_LOCK=NO";

        System.setProperty("spring.datasource.url", desktopDbPath);
        System.setProperty("spring.datasource.username", "sa");
        System.setProperty("spring.datasource.password", "");
        System.setProperty("spring.main.headless", "false");
        System.setProperty("server.port", String.valueOf(DESKTOP_PORT));

        ConfigurableApplicationContext context = new SpringApplicationBuilder(IronEdgeApplication.class)
                .run(args);

        Runtime.getRuntime().addShutdownHook(new Thread(context::close));

        int port = ((ServletWebServerApplicationContext) context).getWebServer().getPort();
        openBrowser("http://localhost:" + port + "/index.html");
    }
}
