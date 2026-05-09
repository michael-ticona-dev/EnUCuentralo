class PostController {
    constructor(apiService, securityService) {
        this.api = apiService;
        this.security = securityService;
        this.posts = [];
        this.container = document.getElementById('postsContainer');
    }

    async init() {
        await this.loadPosts();
    }

    async loadPosts() {
        try {
            this.security.logOrmOperation('SELECT', 'posts', {});
            this.posts = await this.api.getPosts();
            this.renderPosts();
        } catch (error) {
            this.container.innerHTML = `<p class="error-msg">Error al cargar posts.</p>`;
        }
    }

    renderPosts() {
        this.container.innerHTML = '';
        if (this.posts.length === 0) {
            this.container.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top:20px;">No hay reportes aún.</p>';
            return;
        }

        this.posts.forEach(post => {
            const card = document.createElement('article');
            card.className = 'post-card';
            
            // Format date
            const dateObj = new Date(post.date);
            const dateStr = dateObj.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' });

            const initial = post.author.charAt(0).toUpperCase();

            // Image HTML
            let imageHtml = '';
            if (post.image) {
                const imgPath = post.image;
                imageHtml = `<img src="${imgPath}" alt="Evidencia" class="post-image">`;
            }

            // SEGURIDAD: Ya NO se pasa whatsapp al DOM.
            // Solo se pasa post.id y post.author al botón Contactar.
            card.innerHTML = `
                <div class="post-avatar">${initial}</div>
                <div class="post-content">
                    <div class="post-header">
                        <div class="post-author">${post.author} <span class="post-date">· ${dateStr}</span></div>
                    </div>
                    <div class="post-desc" id="desc-${post.id}">${post.description}</div>
                    ${imageHtml}
                    <div class="post-actions">
                        <button class="action-btn contact-btn" onclick="app.openChat('${post.author.replace(/'/g, "\\'")}', ${post.id})">
                            <i data-lucide="message-circle"></i> Contactar
                        </button>
                        <button class="action-btn edit-btn" onclick="app.editPost(${post.id})">
                            <i data-lucide="edit-2"></i> Editar
                        </button>
                        <button class="action-btn delete-btn" onclick="app.deletePost(${post.id})">
                            <i data-lucide="trash-2"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
            this.container.appendChild(card);
        });

        lucide.createIcons(); // re-init icons
    }

    async createPost(formData) {
        // Validation handled in app.js before calling this
        try {
            const dataObj = {};
            formData.forEach((value, key) => { dataObj[key] = value; });
            this.security.logOrmOperation('INSERT', 'posts', dataObj);
            
            const newPost = await this.api.createPost(formData);
            this.posts.unshift(newPost); // Add to top
            this.renderPosts();
            return true;
        } catch (error) {
            return false;
        }
    }

    async updatePost(id, newDescription) {
        const cleanDesc = this.security.sanitizeInput(newDescription);
        try {
            this.security.logOrmOperation('UPDATE', 'posts', { id, description: cleanDesc });
            const updated = await this.api.updatePost(id, { description: cleanDesc });
            // Update local state
            const index = this.posts.findIndex(p => p.id === id);
            if (index !== -1) {
                this.posts[index].description = updated.description;
                this.renderPosts();
            }
        } catch (error) {
            alert("Error al actualizar");
        }
    }

    async deletePost(id) {
        if (!confirm("¿Seguro que deseas eliminar este reporte?")) return;
        try {
            this.security.logOrmOperation('DELETE', 'posts', { id });
            await this.api.deletePost(id);
            this.posts = this.posts.filter(p => p.id !== id);
            this.renderPosts();
        } catch (error) {
            alert("Error al eliminar");
        }
    }
}

window.PostController = PostController;
