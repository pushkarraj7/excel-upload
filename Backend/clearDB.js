const mysql = require("mysql2/promise");

async function clearDB() {
  const connection = await mysql.createConnection({
    uri: "mysql://root:xcDxLxYOSwjHRJpkcngFUEgqohVapsHH@nozomi.proxy.rlwy.net:39711/railway",
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    await connection.query("TRUNCATE TABLE price_data");
    await connection.query("TRUNCATE TABLE companies");

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ Tables cleared successfully");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await connection.end();
  }
}

clearDB();