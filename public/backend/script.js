// Student Information Management System - JavaScript

// API Base URL
var API_URL = window.location.origin + '/api';

// State
var students = [];
var deleteTargetId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('edit-form').addEventListener('submit', handleUpdate);
    
    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
    
    loadStudents();
});

// Navigation
function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(function(link) {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active');
    });
    document.getElementById(page + '-page').classList.add('active');
    
    if (page === 'students') {
        loadStudents();
    }
    
    document.querySelector('.nav-links').classList.remove('active');
}

function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

// CREATE - Register new student
function handleRegister(e) {
    e.preventDefault();
    
    var data = {
        student_id: document.getElementById('reg-student-id').value.trim(),
        full_name: document.getElementById('reg-full-name').value.trim(),
        course: document.getElementById('reg-course').value,
        year_level: parseInt(document.getElementById('reg-year-level').value),
        email: document.getElementById('reg-email').value.trim()
    };
    
    fetch(API_URL + '/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            showToast('success', 'Student "' + data.full_name + '" registered successfully!');
            resetForm('register-form');
            navigateTo('students');
        } else {
            showToast('error', result.message || 'Failed to register student');
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        showToast('error', 'Failed to connect to server');
    });
}

// READ - Load all students
function loadStudents() {
    fetch(API_URL + '/students')
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            students = result.data;
            renderStudents();
            updateStats();
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        showToast('error', 'Failed to load students');
    });
}

// READ - Search students
function searchStudents() {
    var query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        loadStudents();
        return;
    }
    
    fetch(API_URL + '/students/search/' + encodeURIComponent(query))
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            students = result.data;
            renderStudents();
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
    });
}

// UPDATE - Edit student
function handleUpdate(e) {
    e.preventDefault();
    
    var id = document.getElementById('edit-id').value;
    var data = {
        student_id: document.getElementById('edit-student-id').value.trim(),
        full_name: document.getElementById('edit-full-name').value.trim(),
        course: document.getElementById('edit-course').value,
        year_level: parseInt(document.getElementById('edit-year-level').value),
        email: document.getElementById('edit-email').value.trim()
    };
    
    fetch(API_URL + '/students/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            showToast('success', 'Student "' + data.full_name + '" updated successfully!');
            navigateTo('students');
        } else {
            showToast('error', result.message || 'Failed to update student');
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        showToast('error', 'Failed to connect to server');
    });
}

// DELETE - Remove student
function deleteStudent() {
    if (!deleteTargetId) return;
    
    fetch(API_URL + '/students/' + deleteTargetId, {
        method: 'DELETE'
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            showToast('success', 'Student deleted successfully');
            closeDeleteModal();
            loadStudents();
        } else {
            showToast('error', result.message || 'Failed to delete student');
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        showToast('error', 'Failed to connect to server');
    });
}

// Render students table
function renderStudents() {
    var tbody = document.getElementById('students-tbody');
    var emptyState = document.getElementById('empty-state');
    var tableContainer = document.querySelector('.table-container');
    
    document.getElementById('student-count').textContent = students.length;
    
    if (students.length === 0) {
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    tableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    var html = '';
    for (var i = 0; i < students.length; i++) {
        var student = students[i];
        html += '<tr>';
        html += '<td><span class="student-id-badge">' + escapeHtml(student.student_id) + '</span></td>';
        html += '<td><div class="student-name-cell"><div class="student-avatar">' + student.full_name.charAt(0).toUpperCase() + '</div>' + escapeHtml(student.full_name) + '</div></td>';
        html += '<td>' + escapeHtml(student.course) + '</td>';
        html += '<td><span class="year-badge year-' + student.year_level + '">' + getYearLabel(student.year_level) + '</span></td>';
        html += '<td>' + escapeHtml(student.email) + '</td>';
        html += '<td><div class="action-buttons">';
        html += '<button class="action-btn edit" onclick="openEdit(' + student.id + ')" title="Edit">✏️</button>';
        html += '<button class="action-btn delete" onclick="openDeleteModal(' + student.id + ')" title="Delete">🗑️</button>';
        html += '</div></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function updateStats() {
    document.getElementById('total-students').textContent = students.length;
}

function openEdit(id) {
    var student = null;
    for (var i = 0; i < students.length; i++) {
        if (students[i].id === id) {
            student = students[i];
            break;
        }
    }
    if (!student) return;
    
    document.getElementById('edit-id').value = student.id;
    document.getElementById('edit-student-id').value = student.student_id;
    document.getElementById('edit-full-name').value = student.full_name;
    document.getElementById('edit-course').value = student.course;
    document.getElementById('edit-year-level').value = student.year_level;
    document.getElementById('edit-email').value = student.email;
    
    navigateTo('edit');
}

function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('confirm-delete-btn').onclick = deleteStudent;
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    loadStudents();
}

function resetForm(formId) {
    document.getElementById(formId).reset();
}

function showToast(type, message) {
    var toast = document.getElementById('toast');
    var icon = document.getElementById('toast-icon');
    var msg = document.getElementById('toast-message');
    
    var icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.className = 'toast ' + type;
    icon.textContent = icons[type];
    msg.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(function() {
        toast.classList.add('hidden');
    }, 4000);
}

function getYearLabel(year) {
    var labels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
    return labels[year] || year + 'th Year';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.id === 'delete-modal') {
        closeDeleteModal();
    }
});

// Keyboard
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});
