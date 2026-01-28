# MySQL Client

This is a basic MySQL client for connecting to MySQL databases and executing queries.

## Configuration

The MySQL client uses the following environment variables from the `.env` file:

```env
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=your_database_name
```

## Usage

### Basic Example

```javascript
const { MySQLClient } = require('./src/db');

async function example() {
  const client = new MySQLClient();
  
  try {
    // Connect to the database
    await client.connect();
    
    // List all tables
    const tables = await client.listTables();
    console.log('Tables:', tables);
    
    // Execute a query
    const results = await client.query('SELECT * FROM your_table WHERE id = ?', [1]);
    console.log('Results:', results);
    
  } finally {
    // Always close the connection
    await client.close();
  }
}
```

### Testing the Connection

To test the MySQL client and list all tables in your database:

```bash
node src/db/mysql-client.test.js
```

This will:

1. Connect to the MySQL server using credentials from `.env`
2. List all tables in the specified database
3. Close the connection

- Checking if a patient belongs to a specific group

## API

### `new MySQLClient()`

Creates a new MySQL client instance using environment variables for configuration.

### `async connect()`

Establishes a connection to the MySQL database.

**Returns:** Promise that resolves to the connection object

**Throws:** Error if connection fails

### `getConnection()`

Gets the current database connection.

**Returns:** The active connection

**Throws:** Error if connection is not established

### `async listTables()`

Lists all tables in the current database.

**Returns:** Promise that resolves to an array of table names

**Throws:** Error if query fails

### `async query(sql, params)`

Executes a SQL query with optional parameters.

**Parameters:**

- `sql` (string): SQL query to execute
- `params` (array): Optional array of parameter values for prepared statements

**Returns:** Promise that resolves to query results

**Throws:** Error if query fails

- Error if category is invalid
- Error if query fails

### `async close()`

Closes the database connection.

## Troubleshooting

### Access Denied Error

If you see an error like:

```
Error: Access denied for user 'username'@'localhost' (using password: YES)
```

This means:

1. The username or password in `.env` is incorrect
2. The MySQL user doesn't have permission to access the database
3. The MySQL server is not running

To fix:

1. Verify your credentials in the `.env` file
2. Make sure the MySQL user has proper permissions:
   ```sql
   GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Ensure MySQL server is running

### Connection Refused

If you see:

```
Error: connect ECONNREFUSED
```

The MySQL server is not running or not accessible on the specified host/port.

