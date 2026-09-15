// Script để kiểm tra và tạo DB mdm_db với user mdm_user
const { Client } = require('pg');

async function setup() {
  // Kết nối với postgres superuser
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres', // thử password mặc định
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL as postgres');

    // Kiểm tra DB
    const dbCheck = await adminClient.query("SELECT datname FROM pg_database WHERE datname='mdm_db'");
    if (dbCheck.rows.length === 0) {
      console.log('Creating mdm_db...');
      await adminClient.query('CREATE DATABASE mdm_db');
      console.log('✅ Database mdm_db created');
    } else {
      console.log('✅ Database mdm_db already exists');
    }

    // Kiểm tra user
    const userCheck = await adminClient.query("SELECT usename FROM pg_user WHERE usename='mdm_user'");
    if (userCheck.rows.length === 0) {
      console.log('Creating mdm_user...');
      await adminClient.query("CREATE USER mdm_user WITH PASSWORD 'mdm_password'");
      console.log('✅ User mdm_user created');
    } else {
      console.log('✅ User mdm_user already exists');
    }

    // Grant privileges
    await adminClient.query('GRANT ALL PRIVILEGES ON DATABASE mdm_db TO mdm_user');
    await adminClient.query('ALTER DATABASE mdm_db OWNER TO mdm_user');
    console.log('✅ Privileges granted to mdm_user');

    await adminClient.end();
    console.log('✅ Setup complete!');
  } catch (err) {
    console.error('❌ Error with postgres/postgres:', err.message);
    
    // Thử với password khác
    const adminClient2 = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '',
      database: 'postgres',
    });
    
    try {
      await adminClient2.connect();
      console.log('✅ Connected with empty password');
      
      const dbCheck = await adminClient2.query("SELECT datname FROM pg_database WHERE datname='mdm_db'");
      if (dbCheck.rows.length === 0) {
        await adminClient2.query('CREATE DATABASE mdm_db');
        console.log('✅ Database mdm_db created');
      } else {
        console.log('✅ Database mdm_db already exists');
      }
      
      const userCheck = await adminClient2.query("SELECT usename FROM pg_user WHERE usename='mdm_user'");
      if (userCheck.rows.length === 0) {
        await adminClient2.query("CREATE USER mdm_user WITH PASSWORD 'mdm_password'");
        console.log('✅ User mdm_user created');
      } else {
        console.log('✅ User mdm_user already exists - updating password');
        await adminClient2.query("ALTER USER mdm_user WITH PASSWORD 'mdm_password'");
      }
      
      await adminClient2.query('GRANT ALL PRIVILEGES ON DATABASE mdm_db TO mdm_user');
      await adminClient2.query('ALTER DATABASE mdm_db OWNER TO mdm_user');
      console.log('✅ Privileges granted');
      await adminClient2.end();
    } catch (err2) {
      console.error('❌ Failed both attempts:', err2.message);
      console.log('\n⚠️  Please run this SQL manually in pgAdmin as superuser:');
      console.log('CREATE DATABASE mdm_db;');
      console.log("CREATE USER mdm_user WITH PASSWORD 'mdm_password';");
      console.log('GRANT ALL PRIVILEGES ON DATABASE mdm_db TO mdm_user;');
      console.log('ALTER DATABASE mdm_db OWNER TO mdm_user;');
      process.exit(1);
    }
  }
}

setup();
