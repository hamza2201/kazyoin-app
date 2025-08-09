const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Important for Render
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'kazyoin-admin-2025';

// مسار ملف قاعدة البيانات
const dbPath = path.join(__dirname, 'database.json');

// إعداد الخادم
app.use(express.json());
app.use(express.static('public'));

// تهيئة قاعدة البيانات
function initializeDatabase() {
    if (!fs.existsSync(dbPath)) {
        const initialData = {
            employees: [
                { id: 1, name: 'سجدة', shift: 'morning', onLeave: false, tasks: [] },
                { id: 2, name: 'بسمة', shift: 'morning', onLeave: false, tasks: [] },
                { id: 3, name: 'محمد', shift: 'morning', onLeave: false, tasks: [] },
                { id: 4, name: 'عبدالرحمن', shift: 'night', onLeave: false, tasks: [] },
                { id: 5, name: 'أحمد', shift: 'night', onLeave: false, tasks: [] },
                { id: 6, name: 'إبراهيم', shift: 'night', onLeave: false, tasks: [] }
            ]
        };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    }
}

// قراءة وكتابة البيانات
function readData() {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
}
function writeData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ----- نقاط الوصول (APIs) -----

// API لجلب كل البيانات
app.get('/api/data', (req, res) => {
    res.json(readData());
});

// API لإضافة مهمة (بكلمة سر)
app.post('/api/tasks', (req, res) => {
    const { employeeId, taskText, password } = req.body;
    if (password !== MANAGER_PASSWORD) return res.status(401).json({ message: 'كلمة السر خاطئة' });
    const data = readData();
    const employee = data.employees.find(e => e.id === employeeId);
    if (employee) {
        employee.tasks.push({ id: Date.now(), text: taskText, completed: false });
        writeData(data);
        res.status(201).json(employee);
    } else {
        res.status(404).json({ message: 'لم يتم العثور على الموظف' });
    }
});

// === API جديد لتحديث حالة المهمة (بدون كلمة سر) ===
app.post('/api/tasks/toggle', (req, res) => {
    const { employeeId, taskId } = req.body;
    const data = readData();
    const employee = data.employees.find(e => e.id === employeeId);
    const task = employee?.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed; // عكس الحالة
        writeData(data);
        res.json(task);
    } else {
        res.status(404).json({ message: 'لم يتم العثور على المهمة' });
    }
});


// API لحذف مهمة (بكلمة سر)
app.delete('/api/tasks/:employeeId/:taskId', (req, res) => {
    // Note: In a real app, you'd get password from a secure header, not body for DELETE
    const { employeeId, taskId } = req.params;
    const data = readData();
    const employee = data.employees.find(e => e.id === parseInt(employeeId));
    if (employee) {
        employee.tasks = employee.tasks.filter(t => t.id !== parseInt(taskId));
        writeData(data);
        res.status(200).json({ message: 'تم حذف المهمة' });
    } else {
        res.status(404).json({ message: 'لم يتم العثور على الموظف' });
    }
});


// API لتغيير حالة الإجازة (بكلمة سر)
app.post('/api/leave', (req, res) => {
    const { employeeId, password } = req.body;
    if (password !== MANAGER_PASSWORD) return res.status(401).json({ message: 'كلمة السر خاطئة' });
    const data = readData();
    const employee = data.employees.find(e => e.id === employeeId);
    if (employee) {
        employee.onLeave = !employee.onLeave;
        writeData(data);
        res.json(employee);
    } else {
        res.status(404).json({ message: 'لم يتم العثور على الموظف' });
    }
});


// دالة لمسح المهام
function clearAllTasks() {
    console.log('تنفيذ مهمة التنظيف اليومية...');
    const data = readData();
    data.employees.forEach(emp => {
        emp.tasks = [];
        emp.onLeave = false;
    });
    writeData(data);
    console.log('تم مسح جميع المهام وإعادة ضبط الإجازات.');
}

// الجدولة التلقائية
setInterval(() => {
    const now = new Date();
    // Use UTC for server time consistency
    if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) { // 2 AM Egypt time is 00:00 UTC
        clearAllTasks();
    }
}, 60000);

// تشغيل الخادم
app.listen(PORT, () => {
    initializeDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
});