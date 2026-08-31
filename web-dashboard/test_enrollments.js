import axios from 'axios';

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8081/api/auth/login', {
      username: 'superadmin',
      password: 'password'
    });
    const token = loginRes.data.data.accessToken;
    
    const res = await axios.get('http://localhost:8081/api/enrollments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
