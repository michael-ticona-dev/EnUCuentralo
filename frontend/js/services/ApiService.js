class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    async getPosts() {
        try {
            const response = await fetch(`${this.baseUrl}/posts`);
            if (!response.ok) throw new Error('Error al obtener posts');
            return await response.json();
        } catch (error) {
            console.error('ApiService Error:', error);
            throw error;
        }
    }

    async createPost(formData) {
        try {
            const response = await fetch(`${this.baseUrl}/posts`, {
                method: 'POST',
                body: formData // using FormData because of image upload
            });
            if (!response.ok) throw new Error('Error al crear post');
            return await response.json();
        } catch (error) {
            console.error('ApiService Error:', error);
            throw error;
        }
    }

    async updatePost(id, data) {
        try {
            const response = await fetch(`${this.baseUrl}/posts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error al actualizar post');
            return await response.json();
        } catch (error) {
            console.error('ApiService Error:', error);
            throw error;
        }
    }

    async deletePost(id) {
        try {
            const response = await fetch(`${this.baseUrl}/posts/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Error al eliminar post');
            return await response.json();
        } catch (error) {
            console.error('ApiService Error:', error);
            throw error;
        }
    }
}

// Export para uso en módulos
window.ApiService = ApiService;
