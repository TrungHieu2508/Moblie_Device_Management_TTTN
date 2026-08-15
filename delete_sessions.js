const { Client } = require('pg');
const client = new Client({
  user: 'postgres', host: 'localhost', database: 'mdm_db', password: 'mdm_password', port: 5432
});
client.connect();
client.query("DELETE FROM public.class_sessions WHERE status = 'ACTIVE'", (err, res) => {
  if (err) throw err;
  console.log('Deleted active sessions:', res.rowCount);
  client.end();
});
