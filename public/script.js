document.addEventListener('DOMContentLoaded', () => {
    const morningContainer = document.getElementById('morning-employees');
    const nightContainer = document.getElementById('night-employees');
    const dateElement = document.getElementById('currentDate');

    dateElement.textContent = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    async function fetchDataAndRender() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error('فشل في جلب البيانات');
            const data = await response.json();
            renderEmployees(data.employees);
        } catch (error) {
            console.error('Error:', error);
            morningContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    function renderEmployees(employees) {
        morningContainer.innerHTML = '';
        nightContainer.innerHTML = '';

        employees.forEach(emp => {
            const container = emp.shift === 'morning' ? morningContainer : nightContainer;
            const card = document.createElement('div');
            card.className = `employee-card ${emp.onLeave ? 'on-leave' : ''}`;
            card.dataset.employeeId = emp.id;

            // === UPDATED TASK HTML WITH CHECKBOX ===
            let tasksHTML = emp.tasks.map(task => `
                <li class="${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <label>${task.text}</label>
                    <button class="delete-task-btn">✕</button>
                </li>
            `).join('');

            card.innerHTML = `
                <div class="employee-header">
                    <h3>${emp.name}</h3>
                    <button class="leave-btn ${emp.onLeave ? 'on-leave' : ''}">${emp.onLeave ? 'إلغاء الإجازة' : 'إجازة'}</button>
                </div>
                <ul class="task-list">${tasksHTML}</ul>
                <form class="add-task-form">
                    <input type="text" placeholder="مهمة جديدة..." required ${emp.onLeave ? 'disabled' : ''}>
                    <button type="submit" ${emp.onLeave ? 'disabled' : ''}>إضافة</button>
                </form>
            `;
            container.appendChild(card);
        });
    }

    // --- Event Listeners ---
    document.body.addEventListener('click', async function(e) {
        const target = e.target;
        const employeeCard = target.closest('.employee-card');
        if (!employeeCard) return;
        const employeeId = parseInt(employeeCard.dataset.employeeId);

        // --- NEW: Handle Checkbox Click ---
        if (target.type === 'checkbox') {
            const taskItem = target.closest('li');
            const taskId = parseInt(taskItem.dataset.taskId);
            try {
                await fetch('/api/tasks/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employeeId, taskId })
                });
                // Visually update immediately without a full re-render for speed
                taskItem.classList.toggle('completed');
            } catch (error) {
                alert('فشل تحديث المهمة. حاول مرة أخرى.');
                // Revert visual change on error
                target.checked = !target.checked;
            }
        }

        // Handle Leave Button
        if (target.classList.contains('leave-btn')) {
            const password = prompt('لتغيير حالة الإجازة، الرجاء إدخال كلمة سر المدير:');
            if (password) { /* ... (rest of the code is the same) */ }
        }

        // Handle Delete Button
        if (target.classList.contains('delete-task-btn')) {
             const password = prompt('لحذف المهمة، الرجاء إدخال كلمة سر المدير:');
             if(password) {
                // To keep the code clean, we'll just re-render on delete
                try {
                    const taskItem = target.closest('li');
                    const taskId = taskItem.dataset.taskId;
                    await fetch(`/api/tasks/${employeeId}/${taskId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password }) // Not ideal, but works for this case
                    });
                    fetchDataAndRender(); // Re-render the whole UI
                } catch(error) {
                    alert('فشل الحذف');
                }
             }
        }
    });

    document.body.addEventListener('submit', async function(e) {
        if (e.target.classList.contains('add-task-form')) {
            /* ... (this part of the code is the same) */
            e.preventDefault();
            const card = e.target.closest('.employee-card');
            const employeeId = parseInt(card.dataset.employeeId);
            const input = e.target.querySelector('input[type="text"]');
            const taskText = input.value.trim();

            if (taskText) {
                const password = prompt('لإضافة مهمة، الرجاء إدخال كلمة سر المدير:');
                if (password) {
                    try {
                        const response = await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ employeeId, taskText, password })
                        });
                        if (!response.ok) throw new Error((await response.json()).message);
                        fetchDataAndRender();
                    } catch (error) {
                        alert(`خطأ: ${error.message}`);
                    }
                }
            }
        }
    });

    fetchDataAndRender();
    // Refresh data every 30 seconds to see updates from others
    setInterval(fetchDataAndRender, 30000); 
});