const express = require('express');
const { sql } = require('@vercel/postgres');
const path = require('path');

const app = express();
app.use(express.json());

const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'kazyoin-admin-2025';

// Serve static files from the 'public' directory
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));


// دالة لإنشاء الجداول وإدخال الموظفين لأول مرة فقط
async function initializeDatabase() {
    try {
        // إنشاء جدول الموظفين إذا لم يكن موجوداً
        await sql`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                shift VARCHAR(50) NOT NULL,
                on_leave BOOLEAN DEFAULT FALSE
            );
        `;
        // إنشاء جدول المهام إذا لم يكن موجوداً
        await sql`
            CREATE TABLE IF NOT EXISTS tasks (
                id BIGINT PRIMARY KEY,
                text TEXT NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                employee_id INTEGER REFERENCES employees(id)
            );
        `;
        
        // إضافة الموظفين الأساسيين إذا لم يكونوا موجودين
        const employees = [
            { id: 1, name: 'سجدة', shift: 'morning' },
            { id: 2, name: 'بسمة', shift: 'morning' },
            { id: 3, name: 'محمد', shift: 'morning' },
            { id: 4, name: 'عبدالرحمن', shift: 'night' },
            { id: 5, name: 'أحمد', shift: 'night' },
            { id: 6, name: 'إبراهيم', shift: 'night' }
        ];

        for (const emp of employees) {
            await sql`
                INSERT INTO employees (id, name, shift)
                VALUES (${emp.id}, ${emp.name}, ${emp.shift})
                ON CONFLICT (id) DO NOTHING;
            `;
        }
        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}
// تهيئة قاعدة البيانات عند بدء تشغيل الخادم
initializeDatabase();

// ----- نقاط الوصول (APIs) -----

// جلب كل البيانات
app.get('/api/data', async (req, res) => {
    try {
        const { rows: employees } = await sql`SELECT id, name, shift, on_leave FROM employees ORDER BY id`;
        const { rows: tasks } = await sql`SELECT id, text, completed, employee_id FROM tasks`;

        employees.forEach(emp => {
            emp.onLeave = emp.on_leave; // ليتوافق مع الواجهة
            emp.tasks = tasks.filter(task => task.employee_id === emp.id);
        });

        res.json({ employees });
    } catch (error) {
        console.error('Failed to fetch data:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

// إضافة مهمة
app.post('/api/tasks', async (req, res) => {
    const { employeeId, taskText, password } = req.body;
    if (password !== MANAGER_PASSWORD) return res.status(401).json({ message: 'كلمة السر خاطئة' });
    
    try {
        const taskId = Date.now();
        await sql`
            INSERT INTO tasks (id, text, employee_id)
            VALUES (${taskId}, ${taskText}, ${employeeId});
        `;
        res.status(201).json({ message: 'Task added' });
    } catch (error) {
        console.error('Failed to add task:', error);
        res.status(500).json({ message: 'Error adding task' });
    }
});

// تغيير حالة المهمة (إتمامها)
app.post('/api/tasks/toggle', async (req, res) => {
    const { employeeId, taskId } = req.body;
    try {
        await sql`
            UPDATE tasks
            SET completed = NOT completed
            WHERE id = ${taskId} AND employee_id = ${employeeId};
        `;
        res.status(200).json({ message: 'Task toggled' });
    } catch (error) {
        console.error('Failed to toggle task:', error);
        res.status(500).json({ message: 'Error toggling task' });
    }
});

// تغيير حالة الإجازة
app.post('/api/leave', async (req, res) => {
    const { employeeId, password } = req.body;
    if (password !== MANAGER_PASSWORD) return res.status(401).json({ message: 'كلمة السر خاطئة' });

    try {
        await sql`
            UPDATE employees
            SET on_leave = NOT on_leave
            WHERE id = ${employeeId};
        `;
        res.status(200).json({ message: 'Leave status updated' });
    } catch (error) {
        console.error('Failed to update leave status:', error);
        res.status(500).json({ message: 'Error updating leave status' });
    }
});

// حذف مهمة
app.delete('/api/tasks/delete', async (req, res) => {
    const { taskId, password } = req.body;
    if (password !== MANAGER_PASSWORD) return res.status(401).json({ message: 'كلمة السر خاطئة' });

    try {
        await sql`DELETE FROM tasks WHERE id = ${taskId};`;
        res.status(200).json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Failed to delete task:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
});


// وظيفة التنظيف التلقائي اليومية (غير مدعومة مباشرة في بيئة Vercel Serverless)
// يمكن استبدالها بـ "Vercel Cron Jobs"
// حالياً، سنعتمد على الحذف اليدوي للمهام.

// تصدير التطبيق لمنصة Vercel
module.exports = app;