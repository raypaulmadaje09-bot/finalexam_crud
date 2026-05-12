/**
 * ============================================
 * STUDENT INFORMATION MANAGEMENT SYSTEM
 * Backend API Server
 * ============================================
 * 
 * Final Exam Project
 * Technologies: Node.js, Express.js, MySQL (Aiven Cloud)
 * Deployment: Render
 * 
 * Author: [Your Name]
 * Date: 2024
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cors({
    origin: '*', // Allow all origins (configure for production)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for frontend if in same directory)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// AIVEN CLOUD DATABASE CONFIGURATION
// ============================================
const dbConfig = {
    host: process.env.DB_HOST || 'mysql-xxxxxxxx-xxxx.aivencloud.com',
    port: parseInt(process.env.DB_PORT) || 12345,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'your-password',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: {
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000
};

// Database connection pool
let pool;

/**
 * Initialize database connection and create tables
 */
async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to Aiven Cloud MySQL...');
        pool = mysql.createPool(dbConfig);
        
        // Test the connection
        const connection = await pool.getConnection();
        console.log('✅ Successfully connected to Aiven Cloud MySQL Database');
        
        // Create students table if it doesn't exist
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(20) NOT NULL UNIQUE,
                full_name VARCHAR(100) NOT NULL,
                course VARCHAR(100) NOT NULL,
                year_level INT NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_student_id (student_id),
                INDEX idx_email (email),
                INDEX idx_course (course)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.query(createTableSQL);
        console.log('✅ Students table is ready');
        
        // Check if table is empty, insert sample data
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM students');
        if (rows[0].count === 0) {
            console.log('📝 Inserting sample data...');
            await insertSampleData(connection);
        }
        
        connection.release();
        console.log('✅ Database initialization complete');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your Aiven credentials in .env file');
        // Don't exit in production, allow retry
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

/**
 * Insert sample student data
 */
async function insertSampleData(connection) {
    const sampleStudents = [
        ['2024-0001', 'Juan Dela Cruz', 'BS Computer Science', 3, 'juan.delacruz@university.edu'],
        ['2024-0002', 'Maria Santos', 'BS Information Technology', 2, 'maria.santos@university.edu'],
        ['2024-0003', 'Carlos Reyes', 'BS Information Systems', 4, 'carlos.reyes@university.edu'],
        ['2024-0004', 'Angela Garcia', 'BS Computer Engineering', 1, 'angela.garcia@university.edu'],
        ['2024-0005', 'Marco Villanueva', 'BS Data Science', 2, 'marco.villanueva@university.edu']
    ];
    
    const insertSQL = `
        INSERT INTO students (student_id, full_name, course, year_level, email) 
        VALUES (?, ?, ?, ?, ?)
    `;
    
    for (const student of sampleStudents) {
        try {
            await connection.query(insertSQL, student);
        } catch (err) {
            // Ignore duplicate errors
            if (err.code !== 'ER_DUP_ENTRY') throw err;
        }
    }
    console.log('✅ Sample data inserted');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Async error handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate student data
 */
function validateStudentData(data, isUpdate = false) {
    const errors = [];
    
    if (!isUpdate || data.student_id !== undefined) {
        if (!data.student_id || data.student_id.trim() === '') {
            errors.push('Student ID is required');
        }
    }
    
    if (!isUpdate || data.full_name !== undefined) {
        if (!data.full_name || data.full_name.trim() === '') {
            errors.push('Full name is required');
        }
    }
    
    if (!isUpdate || data.course !== undefined) {
        if (!data.course || data.course.trim() === '') {
            errors.push('Course is required');
        }
    }
    
    if (!isUpdate || data.year_level !== undefined) {
        const yearLevel = parseInt(data.year_level);
        if (isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
            errors.push('Year level must be between 1 and 4');
        }
    }
    
    if (!isUpdate || data.email !== undefined) {
        if (!data.email || !isValidEmail(data.email)) {
            errors.push('Valid email address is required');
        }
    }
    
    return errors;
}

// ============================================
// API ROUTES
// ============================================

/**
 * GET / - API Information
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Student Information Management System API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /api/students': 'Retrieve all students',
            'GET /api/students/:id': 'Retrieve a specific student',
            'POST /api/students': 'Create a new student',
            'PUT /api/students/:id': 'Update a student',
            'DELETE /api/students/:id': 'Delete a student',
            'GET /api/students/search/:query': 'Search students'
        },
        database: 'Aiven Cloud MySQL',
        deployment: 'Render'
    });
});

/**
 * GET /api/students - Retrieve all students (READ)
 */
app.get('/api/students', asyncHandler(async (req, res) => {
    const { sort = 'student_id', order = 'ASC', limit = 100, offset = 0 } = req.query;
    
    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = ['id', 'student_id', 'full_name', 'course', 'year_level', 'email', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'student_id';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    const [students] = await pool.query(
        `SELECT * FROM students ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
    );
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM students');
    
    res.json({
        success: true,
        message: 'Students retrieved successfully',
        data: students,
        pagination: {
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(countResult[0].total / parseInt(limit))
        }
    });
}));

/**
 * GET /api/students/search/:query - Search students (READ)
 */
app.get('/api/students/search/:query', asyncHandler(async (req, res) => {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const [students] = await pool.query(
        `SELECT * FROM students 
         WHERE student_id LIKE ? 
            OR full_name LIKE ? 
            OR course LIKE ? 
            OR email LIKE ?
            OR year_level = ?
         ORDER BY full_name ASC`,
        [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(query) || 0]
    );
    
    res.json({
        success: true,
        message: `Found ${students.length} student(s)`,
        data: students,
        query: query
    });
}));

/**
 * GET /api/students/:id - Retrieve single student (READ)
 */
app.get('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const [students] = await pool.query(
        'SELECT * FROM students WHERE id = ? OR student_id = ?',
        [id, id]
    );
    
    if (students.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Student not found'
        });
    }
    
    res.json({
        success: true,
        message: 'Student retrieved successfully',
        data: students[0]
    });
}));

/**
 * POST /api/students - Create new student (CREATE)
 */
app.post('/api/students', asyncHandler(async (req, res) => {
    const { student_id, full_name, course, year_level, email } = req.body;
    
    // Validate input
    const errors = validateStudentData(req.body);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }
    
    try {
        const [result] = await pool.query(
            `INSERT INTO students (student_id, full_name, course, year_level, email) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                student_id.trim(),
                full_name.trim(),
                course.trim(),
                parseInt(year_level),
                email.trim().toLowerCase()
            ]
        );
        
        // Retrieve the created student
        const [newStudent] = await pool.query(
            'SELECT * FROM students WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: newStudent[0]
        });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            const field = error.message.includes('student_id') ? 'Student ID' : 'Email';
            return res.status(409).json({
                success: false,
                message: `${field} already exists`
            });
        }
        throw error;
    }
}));

/**
 * PUT /api/students/:id - Update student (UPDATE)
 */
app.put('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { student_id, full_name, course, year_level, email } = req.body;
    
    // Check if student exists
    const [existing] = await pool.query(
        'SELECT * FROM students WHERE id = ? OR student_id = ?',
        [id, id]
    );
    
    if (existing.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Student not found'
        });
    }
    
    const currentStudent = existing[0];
    
    // Prepare updated data (use existing values if not provided)
    const updatedData = {
        student_id: student_id?.trim() || currentStudent.student_id,
        full_name: full_name?.trim() || currentStudent.full_name,
        course: course?.trim() || currentStudent.course,
        year_level: year_level ? parseInt(year_level) : currentStudent.year_level,
        email: email?.trim().toLowerCase() || currentStudent.email
    };
    
    // Validate updated data
    const errors = validateStudentData(updatedData, true);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }
    
    try {
        await pool.query(
            `UPDATE students 
             SET student_id = ?, full_name = ?, course = ?, year_level = ?, email = ?
             WHERE id = ?`,
            [
                updatedData.student_id,
                updatedData.full_name,
                updatedData.course,
                updatedData.year_level,
                updatedData.email,
                currentStudent.id
            ]
        );
        
        // Retrieve updated student
        const [updatedStudent] = await pool.query(
            'SELECT * FROM students WHERE id = ?',
            [currentStudent.id]
        );
        
        res.json({
            success: true,
            message: 'Student updated successfully',
            data: updatedStudent[0]
        });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            const field = error.message.includes('student_id') ? 'Student ID' : 'Email';
            return res.status(409).json({
                success: false,
                message: `${field} already exists`
            });
        }
        throw error;
    }
}));

/**
 * DELETE /api/students/:id - Delete student (DELETE)
 */
app.delete('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if student exists
    const [existing] = await pool.query(
        'SELECT * FROM students WHERE id = ? OR student_id = ?',
        [id, id]
    );
    
    if (existing.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Student not found'
        });
    }
    
    const studentToDelete = existing[0];
    
    await pool.query('DELETE FROM students WHERE id = ?', [studentToDelete.id]);
    
    res.json({
        success: true,
        message: 'Student deleted successfully',
        data: studentToDelete
    });
}));

// ============================================
// ERROR HANDLING
// ============================================

// 404 - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
    // Initialize database
    await initializeDatabase();
    
    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║      STUDENT INFORMATION MANAGEMENT SYSTEM                   ║
║      API Server Running                                      ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server:    http://localhost:${PORT}                         ║
║  📊 Database:  Aiven Cloud MySQL                             ║
║  🌐 Status:    ${process.env.NODE_ENV || 'development'}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                              ║
║  • GET    /api/students          - Get all students          ║
║  • GET    /api/students/:id      - Get single student        ║
║  • POST   /api/students          - Create student            ║
║  • PUT    /api/students/:id      - Update student            ║
║  • DELETE /api/students/:id      - Delete student            ║
║  • GET    /api/students/search/:q - Search students          ║
╚══════════════════════════════════════════════════════════════╝
        `);
    });
}

// Start the application
startServer();

// Export for testing
module.exports = app;
