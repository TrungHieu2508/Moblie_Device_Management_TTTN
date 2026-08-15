import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CheckApi {
    public static void main(String[] args) throws Exception {
        // 1. Update password
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("password");
        
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/mdm_db", "postgres", "mdm_password")) {
            PreparedStatement stmt = conn.prepareStatement("UPDATE public.users SET password_hash = ? WHERE username = 'gv01'");
            stmt.setString(1, hash);
            stmt.executeUpdate();
            System.out.println("Password updated!");
        }

        HttpClient client = HttpClient.newHttpClient();
        
        // 2. Login
        String loginBody = "{\"username\":\"gv01\",\"password\":\"password\"}";
        HttpRequest loginReq = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8080/api/auth/login"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(loginBody))
            .build();
            
        HttpResponse<String> loginRes = client.send(loginReq, HttpResponse.BodyHandlers.ofString());
        String loginResBody = loginRes.body();
        System.out.println("Login: " + loginResBody);
        
        // Extract token
        String token = "";
        String search = "\"accessToken\":\"";
        int idx = loginResBody.indexOf(search);
        if (idx != -1) {
            int endIdx = loginResBody.indexOf("\"", idx + search.length());
            token = loginResBody.substring(idx + search.length(), endIdx);
        }
        
        // 3. Get active sessions
        HttpRequest activeReq = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8080/api/class-sessions/active"))
            .header("Authorization", "Bearer " + token)
            .GET()
            .build();
            
        HttpResponse<String> activeRes = client.send(activeReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Active: " + activeRes.body());
    }
}
