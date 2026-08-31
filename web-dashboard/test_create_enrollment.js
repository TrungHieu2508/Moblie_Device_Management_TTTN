import axios from 'axios';

async function test() {
  try {
    let token = null;
    try {
      const loginRes = await axios.post('http://localhost:8081/api/auth/login', {
        username: 'superadmin',
        password: 'password' // or whatever it is, actually the frontend uses this
      });
      token = loginRes.data.data.accessToken;
      console.log('Login success, Token:', token.substring(0, 20) + '...');
    } catch(e) {
      console.log('Login error:', e.response?.status, e.response?.data);
      return;
    }
    
    const payload = {
      campusId: '6bee5cb6-7d3e-41c7-b508-8acaece5c0c9',
      schoolId: '0b613ed2-9205-48d4-acbf-d1da0913b6c7',
      expiresInDays: 7
    };
    
    try {
      const createRes = await axios.post('http://localhost:8081/api/enrollments', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Create success:', JSON.stringify(createRes.data, null, 2));
    } catch(e) {
      console.log('Create error:', e.response?.status, e.response?.data);
    }
    
  } catch (e) {
    console.error('UNEXPECTED ERROR:', e.message);
  }
}
test();
