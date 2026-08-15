import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class TestApi {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        // 1. Login
        String loginBody = "{\"username\":\"gv01\",\"password\":\"password\"}";
        HttpRequest loginReq = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8080/api/auth/login"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(loginBody))
            .build();
            
        HttpResponse<String> loginRes = client.send(loginReq, HttpResponse.BodyHandlers.ofString());
        String loginResBody = loginRes.body();
        System.out.println("Login Response: " + loginResBody);
        
        // Extract token
        String token = "";
        String search = "\"accessToken\":\"";
        int idx = loginResBody.indexOf(search);
        if (idx != -1) {
            int endIdx = loginResBody.indexOf("\"", idx + search.length());
            token = loginResBody.substring(idx + search.length(), endIdx);
        }
        
        if (token.isEmpty()) {
            System.out.println("Could not find token!");
            return;
        }
        
        // 2. Get active sessions
        HttpRequest activeReq = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8080/api/class-sessions/active"))
            .header("Authorization", "Bearer " + token)
            .GET()
            .build();
            
        HttpResponse<String> activeRes = client.send(activeReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Active Sessions: " + activeRes.body());

        // 3. Get scheduled sessions
        HttpRequest scheduledReq = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:8080/api/class-sessions/scheduled"))
            .header("Authorization", "Bearer " + token)
            .GET()
            .build();
            
        HttpResponse<String> scheduledRes = client.send(scheduledReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("Scheduled Sessions: " + scheduledRes.body());
    }
}
