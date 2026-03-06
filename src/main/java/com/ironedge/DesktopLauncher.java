package com.ironedge;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.paint.Color;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import javafx.stage.StageStyle;

public class DesktopLauncher extends Application {

    private ConfigurableApplicationContext springContext;
    private double dragOffsetX = 0;
    private double dragOffsetY = 0;

    @Override
    public void start(Stage stage) {
        stage.initStyle(StageStyle.UNDECORATED);

        String desktopDbPath = "jdbc:h2:file:" + System.getProperty("user.home").replace("\\", "/")
                + "/.ironedge/data/ironedge-desktop;MODE=PostgreSQL;DB_CLOSE_ON_EXIT=FALSE;FILE_LOCK=NO";

        System.setProperty("spring.datasource.url", desktopDbPath);
        System.setProperty("spring.datasource.username", "sa");
        System.setProperty("spring.datasource.password", "");
        System.setProperty("spring.main.headless", "false");
        System.setProperty("server.port", "0");

        springContext = new SpringApplicationBuilder(IronEdgeApplication.class)
                .run();

        int port = ((ServletWebServerApplicationContext) springContext).getWebServer().getPort();

        WebView webView = new WebView();
        webView.getEngine().load("http://localhost:" + port + "/index.html");

        BorderPane root = new BorderPane();
        root.setTop(buildTitleBar(stage));
        root.setCenter(webView);

        Scene scene = new Scene(root, 1280, 800);
        scene.setFill(Color.BLACK);
        stage.setMinWidth(1024);
        stage.setMinHeight(700);
        stage.setScene(scene);
        stage.show();

        stage.setOnCloseRequest(event -> {
            if (springContext != null) {
                springContext.close();
            }
            Platform.exit();
        });
    }

    private HBox buildTitleBar(Stage stage) {
        Label title = new Label("IronEdge");
        title.setStyle("-fx-text-fill: #f8fafc; -fx-font-size: 12px; -fx-font-weight: 600;");

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button minimize = createWindowButton("-", "#94a3b8", "#111827");
        minimize.setOnAction(event -> stage.setIconified(true));

        Button maximize = createWindowButton("[ ]", "#94a3b8", "#111827");
        maximize.setOnAction(event -> stage.setMaximized(!stage.isMaximized()));

        Button close = createWindowButton("X", "#f8fafc", "#b91c1c");
        close.setOnAction(event -> {
            if (springContext != null) {
                springContext.close();
            }
            Platform.exit();
        });

        HBox bar = new HBox(6, title, spacer, minimize, maximize, close);
        bar.setAlignment(Pos.CENTER_LEFT);
        bar.setPadding(new Insets(6, 8, 6, 10));
        bar.setStyle("-fx-background-color: #000000; -fx-border-color: #0f172a; -fx-border-width: 0 0 1 0;");

        bar.setOnMousePressed(event -> {
            if (!stage.isMaximized()) {
                dragOffsetX = event.getSceneX();
                dragOffsetY = event.getSceneY();
            }
        });

        bar.setOnMouseDragged(event -> {
            if (!stage.isMaximized()) {
                stage.setX(event.getScreenX() - dragOffsetX);
                stage.setY(event.getScreenY() - dragOffsetY);
            }
        });

        bar.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                stage.setMaximized(!stage.isMaximized());
            }
        });

        return bar;
    }

    private Button createWindowButton(String text, String color, String hoverColor) {
        Button button = new Button(text);
        button.setFocusTraversable(false);
        button.setPrefSize(32, 24);
        button.setStyle("-fx-background-color: transparent; -fx-text-fill: " + color + "; -fx-font-size: 12px; -fx-font-weight: 700; -fx-cursor: hand;");
        button.setOnMouseEntered(event -> button.setStyle("-fx-background-color: " + hoverColor + "; -fx-text-fill: " + color + "; -fx-font-size: 12px; -fx-font-weight: 700; -fx-cursor: hand;"));
        button.setOnMouseExited(event -> button.setStyle("-fx-background-color: transparent; -fx-text-fill: " + color + "; -fx-font-size: 12px; -fx-font-weight: 700; -fx-cursor: hand;"));
        return button;
    }

    public static void main(String[] args) {
        launch(args);
    }
}
