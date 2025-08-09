const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'kazyoin-admin-2025';
const dbPath = path.join(__dirname, '..', 'tmp', 'database.json'); // مسار معدل ليتوافق مع Vercel

// إعداد الخادم
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'))); // مسار معدل ليتوافق مع Vercel

// -- هذا هو السطر الجديد والمهم لإصلاح المشكلة --
// إرسال ملف الواجهة الرئيسي عند طلب الرابط الأساسي
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// دالة لتهيئة قاعدة البيانات في Vercel
function initializeDatabase() {
    const dir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
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
    initializeDatabase(); // تأكد من وجود الملف قبل القراءة
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
}
function writeData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ----- نقاط الوصول (APIs) -----

app.get('/api/data', (req, res) => {
    res.json(readData());
});

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

app.post('/api/tasks/toggle', (req, res) => {
    const { employeeId, taskId } = req.body;
    const data = readData();
    const employee = data.employees.find(e => e.id === employeeId);
    const task = employee?.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        writeData(data);
        res.json(task);
    } else {
        res.status(404).json({ message: 'لم يتم العثور على المهمة' });
    }
});

// ... باقي الأكواد الخاصة بالحذف والإجازة ...

// تصدير التطبيق لمنصة Vercel
module.exports = app;