// Global variables
let currentUser = null;
let isAuthenticated = false;
let pendingUser = null;
let adminVerified = false;

// Admin credentials (in a real app, this would be on a server)
const adminCredentials = {
    'Lohith': 'adminclub101',
    'Nitin': 'adminclub102',
    'Dhanunjay': 'adminclub103',
    'Praveen': 'adminclub104',
};



// User storage
let users = JSON.parse(localStorage.getItem('users')) || [];

// Doubts & Answers Logic
let doubts = JSON.parse(localStorage.getItem('doubts')) || [];

function saveDoubts() {
    localStorage.setItem('doubts', JSON.stringify(doubts));
}

function renderDoubts() {
    const doubtsList = document.getElementById('doubtsList');
    if (!doubtsList) return;
    doubtsList.innerHTML = '';
    if (doubts.length === 0) {
        doubtsList.innerHTML = '<p style="color:#888;text-align:center;">No doubts have been posted yet. Be the first to ask a question!</p>';
        return;
    }
    doubts.slice().reverse().forEach(doubt => {
        const doubtCard = document.createElement('div');
        doubtCard.className = 'doubt-card';
        doubtCard.innerHTML = `
            <div class="doubt-meta">Asked by <strong>${doubt.author}</strong> on ${doubt.date}</div>
            <div class="doubt-question">${escapeHTML(doubt.text)}</div>
            <div class="answers-list" id="answers-${doubt.id}">
                ${doubt.answers && doubt.answers.length > 0 ? doubt.answers.map(a => `
                    <div class="answer-card">
                        <div class="answer-meta">Answered by <strong>${a.author}</strong> on ${a.date}</div>
                        <div class="answer-text">${escapeHTML(a.text)}</div>
                    </div>
                `).join('') : '<div style="color:#aaa;">No answers yet.</div>'}
            </div>
            <form class="answer-form" data-doubt-id="${doubt.id}">
                <textarea placeholder="Write your answer..." rows="2" required></textarea>
                <button type="submit" class="btn btn-primary">Reply</button>
            </form>
        `;
        doubtsList.appendChild(doubtCard);
    });
    // Attach answer form handlers
    document.querySelectorAll('.answer-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!currentUser) {
                alert('You must be logged in to reply.');
                return;
            }
            const doubtId = this.getAttribute('data-doubt-id');
            const answerText = this.querySelector('textarea').value.trim();
            if (!answerText) return;
            const doubt = doubts.find(d => d.id == doubtId);
            if (!doubt) return;
            if (!doubt.answers) doubt.answers = [];
            doubt.answers.push({
                author: currentUser.name || currentUser.username,
                text: answerText,
                date: new Date().toLocaleString()
            });
            saveDoubts();
            renderDoubts();
        });
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>"'/]/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;',
            '/': '&#x2F;'
        };
        return charsToReplace[tag] || tag;
    });
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    checkAuthentication();
    
    const uploadForm = document.getElementById('videoUploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUploadSubmit);
    }
    
    window.openAdminVerifyModal = openAdminVerifyModal;
    window.closeAdminVerifyModal = closeAdminVerifyModal;
    renderDoubts();
    const doubtForm = document.getElementById('doubtForm');
    if (doubtForm) {
        doubtForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!currentUser) {
                alert('You must be logged in to post a doubt.');
                return;
            }
            const doubtText = document.getElementById('doubtText').value.trim();
            if (!doubtText) return;
            const newDoubt = {
                id: Date.now(),
                text: doubtText,
                author: currentUser.name || currentUser.username,
                date: new Date().toLocaleString(),
                answers: []
            };
            doubts.push(newDoubt);
            saveDoubts();
            renderDoubts();
            doubtForm.reset();
        });
    }

    if (localStorage.getItem('adminVerified') === 'true') {
        adminVerified = true;
        if (window.location.hash === '#signup') {
            const signupForm = document.getElementById('signupForm');
            if (signupForm) signupForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    initializeUploadSystem();

    // Load videos and set up filters if on the videos page
    if (window.location.pathname.endsWith('videos.html')) {
        loadVideos();
        setupVideoFilters();
    }
});

function initializeUploadSystem() {
    const adminUploadBtn = document.getElementById('adminUploadBtn');
    if (adminUploadBtn) {
        adminUploadBtn.addEventListener('click', handleAdminUploadClick);
    }
    
    const videoUploadForm = document.getElementById('videoUploadForm');
    if (videoUploadForm) {
        videoUploadForm.addEventListener('submit', handleVideoUploadSubmit);
    }
}

function handleAdminUploadClick(e) {
    e.preventDefault();
    if (!currentUser) {
        alert('Please login first to upload videos.');
        return;
    }
    
    if (!currentUser.isAdmin) {
        alert('Only administrators can upload videos.');
        return;
    }
    
    openVideoUploadModal();
}

function openVideoUploadModal() {
    const modal = document.getElementById('videoUploadModal');
    const adminNameSpan = document.getElementById('uploadAdminName');
    
    if (!modal) {
        console.error('Video upload modal not found!');
        alert('Error: Upload modal not found. Please refresh the page.');
        return;
    }
    
    if (adminNameSpan && currentUser) {
        adminNameSpan.textContent = currentUser.name || currentUser.username;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeVideoUploadModal() {
    const modal = document.getElementById('videoUploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        const form = document.getElementById('videoUploadForm');
        if (form) {
            form.reset();
        }
    }
}

async function handleVideoUploadSubmit(e) {
    e.preventDefault();
    
    if (!currentUser || !currentUser.isAdmin) {
        alert('You must be logged in as an administrator to upload videos.');
        return;
    }
    
    const title = document.getElementById('videoTitle').value.trim();
    const category = document.getElementById('videoCategory').value;
    const description = document.getElementById('videoDescription').value.trim();
    const videoFile = document.getElementById('videoFile').files[0];
    
    if (!title || !category || !description || !videoFile) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (!videoFile.type.startsWith('video/')) {
        alert('Please select a valid video file.');
        return;
    }
    
    if (videoFile.size > 50 * 1024 * 1024) {
        alert('Video file size must be less than 50MB.');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('videoFile', videoFile);

    try {
        const response = await fetch('http://localhost:3000/uploadVideo', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const responseData = await response.json();
            const newVideo = {
                title: title,
                category: category,
                description: description,
                uploadDate: new Date().toISOString(),
                videoUrl: responseData.filePath
            };
            videosData.push(newVideo);
            localStorage.setItem('videosData', JSON.stringify(videosData));
            closeVideoUploadModal();
            alert(`Video "${title}" uploaded successfully! It's now available in the Our Videos section.`);
            if (window.location.pathname.endsWith('videos.html')) {
                loadVideos();
            }
        } else {
            const errorText = await response.text();
            alert(`Error uploading video: ${errorText}`);
        }
    } catch (error) {
        alert('Network error during video upload. Please check your server connection.');
    }
}

function checkAuthentication() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAuthenticated = true;
        showMainContent();
        updateUserProfile();
    } else {
        showAuthOverlay();
    }
}

function showAuthOverlay() {
    const authOverlay = document.getElementById('authOverlay');
    if(authOverlay) authOverlay.style.display = 'flex';
    document.body.classList.remove('authenticated');
}

function hideAuthOverlay() {
    const authOverlay = document.getElementById('authOverlay');
    if(authOverlay) authOverlay.style.display = 'none';
    document.body.classList.add('authenticated');
}

function showMainContent() {
    hideAuthOverlay();
    updateUserProfile();
}

function updateUserProfile() {
    if (currentUser) {
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const navUploadLi = document.getElementById('nav-upload-li');
        
        if(userProfile) userProfile.style.display = 'flex';
        const userInitialAvatar = document.getElementById('userInitialAvatar');
        if (userInitialAvatar) {
            userInitialAvatar.textContent = (currentUser.name || currentUser.username || 'U')[0].toUpperCase();
            userInitialAvatar.style.display = 'flex';
        }
        if (userAvatar) userAvatar.style.display = 'none';
        if(userName) userName.textContent = currentUser.name || currentUser.username;
        
        if (currentUser.isAdmin) {
            if(userRole) userRole.textContent = 'Admin';
            if(userRole) userRole.style.color = '#000000';
            if(userRole) userRole.style.fontWeight = '600';
            if (navUploadLi) navUploadLi.style.display = 'block';
        } else {
            if(userRole) userRole.textContent = 'Student';
            if(userRole) userRole.style.color = '#666666';
            if(userRole) userRole.style.fontWeight = '400';
            if (navUploadLi) navUploadLi.style.display = 'none';
        }

        const adminUploadSection = document.getElementById('adminUploadSection');
        if (adminUploadSection) {
            if (currentUser.isAdmin) {
                adminUploadSection.style.display = 'block';
            } else {
                adminUploadSection.style.display = 'none';
            }
        }
    }
}

function showSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if(loginForm) loginForm.style.display = 'none';
    if(signupForm) signupForm.style.display = 'block';
}

function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if(loginForm) loginForm.style.display = 'block';
    if(signupForm) signupForm.style.display = 'none';
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const loginAsAdmin = document.getElementById('loginIsAdmin').checked;

        const adminKey = Object.keys(adminCredentials).find(key => key.toLowerCase() === username.toLowerCase());
        const isCorrectAdminPassword = adminKey && adminCredentials[adminKey] === password;

        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (loginAsAdmin) {
            if (isCorrectAdminPassword) {
                currentUser = { username: adminKey, name: adminKey, isAdmin: true, avatar: 'https://via.placeholder.com/40' };
                authenticateUser(currentUser);
            } else {
                alert('Invalid admin username or password.');
            }
        } else { 
            if (user) {
                if (user.isAdmin) {
                    alert('You have admin privileges. Please check "Login as admin" to log in.');
                } else {
                    currentUser = user;
                    authenticateUser(currentUser);
                }
            } else {
                if (isCorrectAdminPassword) {
                    alert('You are an admin. Please check the "Login as admin" box to log in.');
                } else {
                    alert('Invalid username or password. Please try again.');
                }
            }
        }
    });
}

function openAdminVerifyModal() {
    const adminVerifyModal = document.getElementById('adminVerifyModal');
    if(adminVerifyModal) adminVerifyModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const adminVerifyError = document.getElementById('adminVerifyError');
    if(adminVerifyError) adminVerifyError.style.display = 'none';
    const adminVerifyForm = document.getElementById('adminVerifyForm');
    if(adminVerifyForm) adminVerifyForm.reset();
}

function closeAdminVerifyModal() {
    const adminVerifyModal = document.getElementById('adminVerifyModal');
    if(adminVerifyModal) adminVerifyModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

const adminVerifyForm = document.getElementById('adminVerifyForm');
if(adminVerifyForm) {
    adminVerifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('verifyAdminUsername').value.trim();
        const password = document.getElementById('verifyAdminPassword').value;
        const adminKey = Object.keys(adminCredentials).find(key => key.toLowerCase() === username.toLowerCase());
        if (adminKey && adminCredentials[adminKey] === password) {
            adminVerified = true;
            closeAdminVerifyModal();
            const adminVerifyError = document.getElementById('adminVerifyError');
            if(adminVerifyError) adminVerifyError.style.display = 'none';
            alert('Admin verified! You can now sign up as an admin.');
        } else {
            adminVerified = false;
            const adminVerifyError = document.getElementById('adminVerifyError');
            if(adminVerifyError) adminVerifyError.textContent = 'Invalid admin username or password.';
            if(adminVerifyError) adminVerifyError.style.display = 'block';
        }
    });
}

const signupForm = document.getElementById('signupForm');
if(signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const isAdmin = adminVerified;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters long!');
            return;
        }
        
        if (users.find(u => u.username === username)) {
            alert('Username already exists!');
            return;
        }
        
        const newUser = {
            username: username,
            password: password,
            isAdmin: isAdmin
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        authenticateUser(newUser);
        adminVerified = false;
        localStorage.removeItem('adminVerified');
    });
}

function authenticateUser(user) {
    currentUser = user;
    isAuthenticated = true;
    localStorage.setItem('currentUser', JSON.stringify(user));
    showMainContent();
}

function logout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('currentUser');
    const navUploadLi = document.getElementById('nav-upload-li');
    if (navUploadLi) {
        navUploadLi.style.display = 'none';
    }
    showAuthOverlay();
    
    const loginForm = document.getElementById('loginForm');
    if(loginForm) loginForm.reset();
    const signupForm = document.getElementById('signupForm');
    if(signupForm) signupForm.reset();
    showLogin();
}

const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if(hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    if(hamburger) hamburger.classList.remove('active');
    if(navMenu) navMenu.classList.remove('active');
}));

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.length > 1 && document.querySelector(href)) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if(navbar) {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
});

function openLoginModal() {
    if (!isAuthenticated) {
        alert('Please login to your account first.');
        return;
    }
    
    if (!currentUser.isAdmin) {
        alert('Only administrators can upload content.');
        return;
    }
    
    const modal = document.getElementById('uploadModal');
    if(modal) modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if(modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openUploadModal() {
    if (!isAuthenticated) {
        alert('Please login to your account first.');
        return;
    }
    
    if (!currentUser.isAdmin) {
        alert('Only administrators can upload content.');
        return;
    }
    
    const modal = document.getElementById('videoUploadModal');
    if(modal) modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if(modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.addEventListener('click', (e) => {
    const uploadModal = document.getElementById('uploadModal');
    const loginModal = document.getElementById('loginModal');
    const topicDetailsModal = document.getElementById('topicDetailsModal');
    if (e.target === uploadModal) {
        closeUploadModal();
    }
    if (e.target === loginModal) {
        closeLoginModal();
    }
    if (e.target === topicDetailsModal) {
        closeTopicDetailsModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUploadModal();
        closeLoginModal();
        closeTopicDetailsModal();
    }
});

function handleUploadFormSubmission(e) {
    e.preventDefault();
    
    if (!isAuthenticated || !currentUser.isAdmin) {
        alert('You must be logged in as an administrator to upload content.');
        return;
    }
    
    const title = document.getElementById('topicTitle').value.trim();
    const category = document.getElementById('topicCategory').value;
    const content = document.getElementById('topicContent').value.trim();
    const files = document.getElementById('topicFile').files;
    
    if (!title || !category || !content) {
        alert('Please fill all fields');
        return;
    }
    
    const newTopic = {
        id: Date.now(),
        title: title,
        category: category,
        content: content,
        author: currentUser.name || currentUser.username,
        date: new Date().toLocaleDateString(),
        files: []
    };
    
    if (files.length > 0) {
        let filesProcessed = 0;
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                };
                newTopic.files.push(fileData);
                
                filesProcessed++;
                
                if (filesProcessed === totalFiles) {
                    saveAndDisplayTopic(newTopic);
                }
            };
            
            reader.onerror = function() {
                alert(`Error reading file: ${file.name}`);
                filesProcessed++;
                if (filesProcessed === totalFiles) {
                    saveAndDisplayTopic(newTopic);
                }
            };
            
            if (file.type.startsWith('video/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        }
    } else {
        saveAndDisplayTopic(newTopic);
    }
}

async function saveAndDisplayTopic(newTopic) {
    if (!db) {
        alert('Database not initialized. Please refresh the page.');
        return;
    }
    
    try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(newTopic);
        
        request.onsuccess = () => {
            uploadedTopics.push(newTopic);
            
            alert(`Video "${newTopic.title}" uploaded successfully by ${newTopic.author}! It's now visible in the Our Videos section.`);
    
            const form = document.querySelector('.upload-form');
            if (form) form.reset();
            closeUploadModal();
        };
        
        request.onerror = () => {
            alert('Error saving video. Please try again.');
        };
        
    } catch (error) {
        alert('Error saving video. Please try again.');
    }
}

const contactForm = document.querySelector('.contact-form');
if(contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const subject = this.querySelectorAll('input[type="text"]')[1].value;
        const message = this.querySelector('textarea').value;
        
        alert(`Thank you for your message, ${name}! We'll get back to you soon.`);
        
        this.reset();
    });
}

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.topic-card, .feature, .contact-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

function addTopicToWebsite(topic) {
    console.log('Topic upload detected but not adding to topics section:', topic.title);
}

function getCategoryIcon(category) {
    const icons = {
        'reactions': 'flask',
        'stoichiometry': 'percentage',
        'thermochemistry': 'temperature-high',
        'atomic': 'atom',
        'solutions': 'tint',
        'electrochemistry': 'bolt',
        'other': 'book'
    };
    return icons[category] || 'book';
}

function showTopicDetails(title, content, category, topicId = null) {
    const modal = document.getElementById('topicDetailsModal');
    const titleElement = document.getElementById('topicDetailsTitle');
    const categoryElement = document.getElementById('topicDetailsCategory');
    const authorElement = document.getElementById('topicDetailsAuthor');
    const contentElement = document.getElementById('topicDetailsContent');
    const filesElement = document.getElementById('topicDetailsFiles');
    
    if(titleElement) titleElement.textContent = title;
    if(categoryElement) categoryElement.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    
    if (topicId) {
        const topic = uploadedTopics.find(t => t.id === topicId);
        if (topic) {
            if(authorElement) authorElement.textContent = topic.author;
            if(contentElement) contentElement.innerHTML = formatContent(topic.content);
            
            if (topic.files && topic.files.length > 0) {
                if(filesElement) filesElement.innerHTML = '<h4>Attached Files:</h4>';
                topic.files.forEach(file => {
                    if (file.type && file.type.startsWith('video/')) {
                        if(filesElement) filesElement.innerHTML += `
                            <div class="video-container">
                                <video controls style="width: 100%; max-width: 600px;">
                                    <source src="${file.data}" type="${file.type}">
                                    Your browser does not support the video tag.
                                </video>
                                <p><strong>${file.name}</strong> (${formatFileSize(file.size)})</p>
                            </div>
                        `;
                    } else {
                        if(filesElement) filesElement.innerHTML += `
                            <div class="file-item">
                                <i class="fas fa-file"></i>
                                <a href="${file.data}" download="${file.name}">${file.name}</a>
                                <span>(${formatFileSize(file.size)})</span>
                            </div>
                        `;
                    }
                });
            } else {
                if(filesElement) filesElement.innerHTML = '<p>No files attached to this topic.</p>';
            }
        }
    } else {
        if(authorElement) authorElement.textContent = 'Chemistry Club';
        if(contentElement) contentElement.innerHTML = formatContent(content);
        if(filesElement) filesElement.innerHTML = '';
    }
    
    if(modal) modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeTopicDetailsModal() {
    const modal = document.getElementById('topicDetailsModal');
    if(modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function formatContent(content) {
    return content.replace(/\n/g, '<br>');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function loadUploadedTopics() {
    if (!db) {
        return;
    }
    
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            uploadedTopics = request.result || [];
        };
        
        request.onerror = () => {
        };
    } catch (error) {
    }
}

function createParticle() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const particle = document.createElement('div');
    
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.background = 'rgba(255, 255, 255, 0.6)';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight + 10;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = -10;
    const duration = Math.random() * 3000 + 2000;
    
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    
    hero.appendChild(particle);
    
    const animation = particle.animate([
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px)`, opacity: 0 }
    ], {
        duration: duration,
        easing: 'linear'
    });
    
    animation.onfinish = () => {
        particle.remove();
    };
}

setInterval(createParticle, 500);

function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 80);
        }, 500);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

function createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.position = 'fixed';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '0%';
    progressBar.style.height = '3px';
    progressBar.style.background = 'linear-gradient(90deg, #000000, #333333)';
    progressBar.style.zIndex = '9999';
    progressBar.style.transition = 'width 0.1s ease';
    
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

createScrollProgress();

function addTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.position = 'absolute';
            tooltip.style.background = '#000000';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '14px';
            tooltip.style.zIndex = '10000';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.3s ease';
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
            
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 10);
            
            this.tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
        });
    });
}

addTooltips(); 

function openProfilePanel() {
    if (!currentUser) return;
    
    const profilePanelAvatar = document.getElementById('profilePanelAvatar');
    const profilePanelName = document.getElementById('profilePanelName');
    const profilePanelRole = document.getElementById('profilePanelRole');
    const profilePanelJoinDate = document.getElementById('profilePanelJoinDate');
    
    if(profilePanelAvatar) profilePanelAvatar.textContent = (currentUser.name || currentUser.username || 'U')[0].toUpperCase();
    
    if(profilePanelName) profilePanelName.textContent = currentUser.name || currentUser.username;
    if(profilePanelRole) profilePanelRole.textContent = currentUser.isAdmin ? 'Admin' : 'Student';
    
    let joinDate;
    if (currentUser.isAdmin) {
        joinDate = 'July 27, 2024';
    } else {
        joinDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    if(profilePanelJoinDate) profilePanelJoinDate.querySelector('span').textContent = joinDate;
    
    const profileTopicsCount = document.getElementById('profileTopicsCount');
    if(profileTopicsCount) profileTopicsCount.textContent = '12';
    const profileQuestionsCount = document.getElementById('profileQuestionsCount');
    if(profileQuestionsCount) profileQuestionsCount.textContent = '5';
    const profileAnswersCount = document.getElementById('profileAnswersCount');
    if(profileAnswersCount) profileAnswersCount.textContent = '8';
    
    const adminButtons = document.querySelectorAll('.action-btn.admin-only');
    adminButtons.forEach(btn => {
        if (currentUser.isAdmin) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });
    
    const profilePanelModal = document.getElementById('profilePanelModal');
    if(profilePanelModal) profilePanelModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeProfilePanel() {
    const profilePanelModal = document.getElementById('profilePanelModal');
    if(profilePanelModal) profilePanelModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openChangePasswordModal() {
    closeProfilePanel();
    const changePasswordModal = document.getElementById('changePasswordModal');
    if(changePasswordModal) changePasswordModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeChangePasswordModal() {
    const changePasswordModal = document.getElementById('changePasswordModal');
    if(changePasswordModal) changePasswordModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    const changePasswordForm = document.getElementById('changePasswordForm');
    if(changePasswordForm) changePasswordForm.reset();
}

function confirmDeleteAccount() {
    closeProfilePanel();
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    if(deleteAccountModal) deleteAccountModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeDeleteAccountModal() {
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    if(deleteAccountModal) deleteAccountModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if(deleteAccountForm) deleteAccountForm.reset();
}

function openAdminPanel() {
    closeProfilePanel();
    openUploadModal();
}

function viewAllUsers() {
    closeProfilePanel();
    alert('User management feature coming soon!');
}

function exportUserData() {
    const joinDate = currentUser.isAdmin ? 'July 27, 2024' : new Date().toLocaleDateString();
    const userData = {
        username: currentUser.username,
        isAdmin: currentUser.isAdmin,
        joinDate: joinDate,
        topicsViewed: 12,
        questionsAsked: 5,
        answersGiven: 8
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentUser.username}_data.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('Your data has been exported!');
}

const changePasswordForm = document.getElementById('changePasswordForm');
if(changePasswordForm) {
    changePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        if (currentPassword !== currentUser.password) {
            alert('Current password is incorrect!');
            return;
        }
        
        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters long!');
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match!');
            return;
        }
        
        currentUser.password = newPassword;
        
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        closeChangePasswordModal();
        alert('Password changed successfully!');
    });
}

const deleteAccountForm = document.getElementById('deleteAccountForm');
if(deleteAccountForm) {
    deleteAccountForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const confirmPassword = document.getElementById('deleteConfirmPassword').value;
        const confirmCheckbox = document.getElementById('deleteConfirmCheckbox').checked;
        
        if (confirmPassword !== currentUser.password) {
            alert('Password is incorrect!');
            return;
        }
        
        if (!confirmCheckbox) {
            alert('Please confirm that you understand this action is irreversible!');
            return;
        }
        
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users.splice(userIndex, 1);
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        localStorage.removeItem('currentUser');
        
        closeDeleteAccountModal();
        alert('Account deleted successfully!');
        
        logout();
    });
}

window.addEventListener('click', function(e) {
    const profileModal = document.getElementById('profilePanelModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    if (e.target === profileModal) {
        closeProfilePanel();
    }
    if (e.target === changePasswordModal) {
        closeChangePasswordModal();
    }
    if (e.target === deleteAccountModal) {
        closeDeleteAccountModal();
    }
});

let videosData = JSON.parse(localStorage.getItem('videosData')) || [];

// Function to load and display videos
async function loadVideos() {
    const videoListContainer = document.getElementById('video-list');
    if (!videoListContainer) return;

    displayVideos(videosData);
}

// Function to display videos based on a given array
function displayVideos(videosToDisplay) {
    const videoListContainer = document.getElementById('video-list');
    if (!videoListContainer) return;

    videoListContainer.innerHTML = ''; // Clear previous videos

    if (videosToDisplay.length === 0) {
        videoListContainer.innerHTML = '<p class="no-videos"><i class="fas fa-video-slash"></i> No videos found matching your criteria.</p>';
        return;
    }

    videosToDisplay.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.classList.add('video-card');
        videoCard.innerHTML = `
            <div class="video-header">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-meta">
                    <span class="video-category">${video.category}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${new Date(video.uploadDate).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="video-content">
                <p class="video-description">${video.description}</p>
                <div class="video-container">
                    <div class="video-thumbnail" data-video-src="${video.videoUrl}">
                        <div class="play-button"><i class="fas fa-play"></i></div>
                    </div>
                    <video class="video-player" controls preload="none">
                        <source src="${video.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
        `;
        videoListContainer.appendChild(videoCard);
    });

    // Add event listeners for play buttons
    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            const videoPlayer = this.nextElementSibling; // The video element is the next sibling
            const playButton = this.querySelector('.play-button');

            if (videoPlayer.paused) {
                // Pause all other playing videos
                document.querySelectorAll('.video-player.playing').forEach(otherVideo => {
                    otherVideo.pause();
                    otherVideo.classList.remove('playing');
                    otherVideo.previousElementSibling.style.display = 'flex'; // Show thumbnail
                });

                videoPlayer.classList.add('playing');
                videoPlayer.play();
                this.style.display = 'none'; // Hide thumbnail
            } else {
                videoPlayer.pause();
                videoPlayer.classList.remove('playing');
                this.style.display = 'flex'; // Show thumbnail
            }
        });
    });
}

// Event listeners for category filters and search
function setupVideoFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterVideos();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('keyup', filterVideos);
    }
}

function filterVideos() {
    const activeCategory = document.querySelector('.filter-btn.active')?.dataset.category || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    let filtered = videosData.filter(video => {
        const matchesCategory = activeCategory === 'all' || video.category.toLowerCase() === activeCategory.toLowerCase();
        const matchesSearch = video.title.toLowerCase().includes(searchTerm) || video.description.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    displayVideos(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('videos.html')) {
        initVideoCarousel();
    }
});

function initVideoCarousel() {
    const carousel = document.querySelector('.video-carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.video-slide');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    let currentIndex = 0;

    function updateCarousel() {
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
        if (slides.length > 2) {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
    }

    if (slides.length > 2) {
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % slides.length;
            updateCarousel();
        });

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateCarousel();
        });
    }

    updateCarousel();
}
