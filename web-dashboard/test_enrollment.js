const baseUrl = 'http://localhost:8080/api';

async function runTest() {
  try {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: '123456' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error("Login failed");
    const token = loginData.data.accessToken;
    console.log("Logged in successfully. Token length: ", token.length);

    // 2. Get Campuses to find IDs
    console.log("Fetching campuses...");
    const campusRes = await fetch(`${baseUrl}/campuses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const campusData = await campusRes.json();
    if (campusData.data.length === 0) throw new Error("No campus found");
    const campusId = campusData.data[0].id;

    // 3. Get Schools
    const schoolRes = await fetch(`${baseUrl}/schools`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const schoolData = await schoolRes.json();
    if (schoolData.data.content.length === 0) throw new Error("No school found");
    const schoolId = schoolData.data.content[0].id;
    console.log(`Using Campus ID: ${campusId}, School ID: ${schoolId}`);

    // 4. Create Enrollment Code
    console.log("Creating enrollment code...");
    const enrollRes = await fetch(`${baseUrl}/enrollments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ schoolId, campusId, maxUses: 10, expiresInHours: 24 })
    });
    const enrollData = await enrollRes.json();
    if (!enrollData.success) throw new Error("Failed to create enrollment code");
    const code = enrollData.data.code;
    console.log("Created Enrollment Code:", code);

    // 5. Register Device using the code
    console.log("Registering device...");
    const regRes = await fetch(`${baseUrl}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'TEST-DEVICE-001',
        deviceName: 'Test Android Phone',
        model: 'Pixel 5',
        androidVersion: '13',
        agentVersion: '1.0.0',
        enrollmentCode: code
      })
    });
    const regData = await regRes.json();
    if (!regData.success) {
      console.log("Registration Error:", regData);
      throw new Error("Failed to register device");
    }
    console.log("Device registered successfully:", regData.data.deviceId);

    // 6. Check if device shows up in device list
    console.log("Fetching device list...");
    const devRes = await fetch(`${baseUrl}/devices?page=0&size=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const devData = await devRes.json();
    console.log(`Found ${devData.data.content.length} devices in list.`);
    if (devData.data.content.length > 0) {
      console.log("First device:", devData.data.content[0].deviceName);
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
