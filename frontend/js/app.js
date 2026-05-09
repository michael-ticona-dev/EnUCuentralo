class App {
    constructor() {
        this.api = new ApiService();
        this.security = new SecurityService();
        this.postController = new PostController(this.api, this.security);

        // Modals
        this.postModal = document.getElementById('postModal');
        this.chatModal = document.getElementById('chatModal');
        
        // Forms
        this.postForm = document.getElementById('postForm');
        this.imageUpload = document.getElementById('imageUpload');
        
        // Admin & Search
        this.adminToggle = document.getElementById('adminModeToggle');
        this.adminRightPanel = document.getElementById('adminRightPanel');
        this.searchInput = document.getElementById('searchInput');
        this.copyXssBtn = document.getElementById('copyXssBtn');
        
        // State
        this.currentChatContact = null;
        this.currentChatPostId = null;       // Solo el ID, ya no el WhatsApp
        this.proofSent = false;              // Track si se envió foto de prueba

        this.init();
    }

    init() {
        this.postController.init();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modal toggles
        document.getElementById('openModalBtn').addEventListener('click', () => {
            this.postModal.style.display = 'flex';
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.postModal.style.display = 'none';
        });

        document.getElementById('closeChatBtn').addEventListener('click', () => {
            this.chatModal.style.display = 'none';
            this.proofSent = false;
        });

        // Image Preview
        this.imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'image/png') {
                    document.getElementById('err-image').textContent = 'Solo se permiten archivos .png';
                    this.imageUpload.value = '';
                    document.getElementById('imagePreviewContainer').style.display = 'none';
                    return;
                }
                document.getElementById('err-image').textContent = '';
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('imagePreview').src = e.target.result;
                    document.getElementById('imagePreviewContainer').style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });

        // Real-time Validation (DOM) + Análisis XSS en Modo Admin
        const inputs = ['firstName', 'lastName', 'dni', 'whatsapp'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => {
                this.validateField(id, input.value);

                // Si Modo Admin está activo, analizar XSS en tiempo real
                if (this.adminToggle.checked) {
                    const result = this.security.analyzeFormField(id, input.value);
                    if (!result.safe) {
                        input.value = '';
                        input.classList.add('invalid');
                    }
                }
            });
        });

        // Análisis XSS en la descripción (textarea)
        const descInput = document.getElementById('description');
        descInput.addEventListener('input', () => {
            if (this.adminToggle.checked) {
                const result = this.security.analyzeFormField('description', descInput.value);
                if (!result.safe) {
                    descInput.value = '';
                    descInput.classList.add('invalid');
                    alert("⚠️ Payload XSS detectado y bloqueado en Descripción");
                }
            }
        });

        // Form Submit
        this.postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });

        // Admin Mode Toggle
        this.adminToggle.addEventListener('change', (e) => {
            const isAdmin = e.target.checked;
            this.adminRightPanel.style.display = isAdmin ? 'block' : 'none';
            this.copyXssBtn.style.display = isAdmin ? 'block' : 'none';
            
            if (isAdmin) {
                this.searchInput.placeholder = "Analizador OWASP Activado...";
                this.security.logSecurityEvent('Modo Admin Activado. Herramientas OWASP listas.', 'sys');
                this.security.logSecurityEvent('Analizador XSS activo en todos los campos del formulario.', 'info');
            } else {
                this.searchInput.placeholder = "Buscar objetos perdidos...";
            }
        });

        // Search & Analyzer
        this.searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const isAdmin = this.adminToggle.checked;
            
            if (val.length > 0 && isAdmin) {
                const safeVal = this.security.realTimeSearchAnalysis(val);
                if (safeVal !== val) {
                    e.target.value = ""; // cleared because XSS found
                    return;
                }
            }

            // Filter posts locally
            const cards = document.querySelectorAll('.post-card');
            cards.forEach(card => {
                const desc = card.querySelector('.post-desc').textContent.toLowerCase();
                const author = card.querySelector('.post-author').textContent.toLowerCase();
                if (desc.includes(val) || author.includes(val)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        // Copy Payload
        this.copyXssBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('<script>alert("Hacked!")</script>');
            this.security.logSecurityEvent('Payload XSS copiado al portapapeles.', 'info');
            alert("Payload XSS copiado! Pégalo en la descripción o búsqueda.");
        });

        // ── Chat Seguro: Flujo de verificación con foto de prueba ────

        // Enviar Foto Prueba
        document.getElementById('sendProofBtn').addEventListener('click', () => {
            this.addChatMessage('📷 Foto de prueba enviada [imagen_prueba.png]', 'sent');
            this.proofSent = true;
            
            // Simular que el otro usuario revisa la foto
            setTimeout(() => {
                this.addChatMessage('He recibido tu foto de prueba. Verificando...', 'received');
            }, 1000);

            setTimeout(() => {
                this.addChatMessage('✅ Foto verificada. Puedes revelar mi contacto.', 'received');
                document.getElementById('acceptProofBtn').style.display = 'inline-block';
            }, 2500);

            this.security.logSecurityEvent('Foto de prueba enviada. Esperando validación...', 'info');
        });

        // Aceptar Prueba y Revelar WhatsApp (descifrado del servidor)
        document.getElementById('acceptProofBtn').addEventListener('click', async () => {
            if (!this.proofSent) {
                alert("Primero debes enviar una foto de prueba.");
                return;
            }

            this.security.logSecurityEvent(`Solicitando descifrado de WhatsApp (POST ID: ${this.currentChatPostId})...`, 'sys');
            this.security.logOrmOperation('DECRYPT', 'posts', { id: this.currentChatPostId });

            try {
                const response = await fetch(`/api/posts/${this.currentChatPostId}/reveal`);
                if (!response.ok) throw new Error('Error al descifrar');
                
                const data = await response.json();

                this.security.logSecurityEvent(`🔓 WhatsApp descifrado exitosamente: ${data.whatsapp.substring(0, 3)}***${data.whatsapp.slice(-2)}`, 'success');
                this.security.logSecurityEvent(`Algoritmo: AES-256-CBC | Descifrado server-side`, 'sys');

                this.addChatMessage(`🔓 Número verificado: ${data.whatsapp}`, 'received');
                this.addChatMessage(`Puedes contactarme por WhatsApp.`, 'received');
                
                document.getElementById('acceptProofBtn').style.display = 'none';
            } catch (error) {
                this.addChatMessage('❌ Error al descifrar contacto.', 'system');
                this.security.logSecurityEvent(`Error en descifrado: ${error.message}`, 'alert');
            }
        });

        // Enviar mensajes en el chat
        document.getElementById('sendChatBtn').addEventListener('click', () => {
            const input = document.getElementById('chatInput');
            if (input.value.trim() !== '') {
                // Simulate encryption logic
                const encrypted = this.security.encryptMessageSim(input.value);
                this.security.logSecurityEvent(`Cifrando mensaje: ${encrypted}`, 'sys');
                this.addChatMessage(input.value, 'sent');
                input.value = '';
            }
        });

        // Enter key para enviar mensaje en chat
        document.getElementById('chatInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('sendChatBtn').click();
            }
        });
    }

    validateField(id, value) {
        const errorSpan = document.getElementById(`err-${id}`);
        const input = document.getElementById(id);
        let isValid = true;
        let msg = '';

        if (id === 'firstName' || id === 'lastName') {
            isValid = this.security.validateName(value);
            msg = isValid ? '' : 'Solo letras y espacios permitidos.';
        } else if (id === 'dni') {
            isValid = this.security.validateDni(value);
            msg = isValid ? '' : 'Debe tener exactamente 8 dígitos.';
        } else if (id === 'whatsapp') {
            isValid = this.security.validatePhone(value);
            msg = isValid ? '' : 'Debe tener exactamente 9 dígitos.';
        }

        if (!isValid && value.length > 0) {
            input.classList.add('invalid');
            errorSpan.textContent = msg;
        } else {
            input.classList.remove('invalid');
            errorSpan.textContent = '';
        }

        return isValid;
    }

    async handleFormSubmit() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const description = document.getElementById('description').value;

        // Run validations
        const fNameVal = this.validateField('firstName', firstName);
        const lNameVal = this.validateField('lastName', lastName);
        const dniVal = this.validateField('dni', document.getElementById('dni').value);
        const wpVal = this.validateField('whatsapp', document.getElementById('whatsapp').value);

        if (!fNameVal || !lNameVal || !dniVal || !wpVal) {
            alert("Por favor corrige los errores antes de enviar.");
            return;
        }

        // Sanitizar descripción contra XSS (doble capa: cliente + servidor)
        const cleanDescription = this.security.sanitizeInput(description);
        if (cleanDescription !== description) {
            document.getElementById('description').value = cleanDescription;
            this.security.logSecurityEvent('Descripción sanitizada antes de envío.', 'alert');
        }

        // Verificar XSS en nombre/apellido
        if (this.security._detectXss(firstName) || this.security._detectXss(lastName)) {
            alert("⚠️ Se detectó código malicioso en los campos de nombre.");
            this.security.logSecurityEvent('🚨 Intento de XSS en campos de nombre — bloqueado.', 'alert');
            return;
        }

        const submitBtn = document.getElementById('submitPostBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publicando...';

        const formData = new FormData();
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('dni', document.getElementById('dni').value);
        formData.append('description', cleanDescription);
        formData.append('whatsapp', document.getElementById('whatsapp').value);
        
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        this.security.logSecurityEvent('DNI será hasheado con bcrypt (server-side).', 'sys');
        this.security.logSecurityEvent('WhatsApp será cifrado con AES-256-CBC (server-side).', 'sys');

        const success = await this.postController.createPost(formData);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar Reporte';

        if (success) {
            this.postModal.style.display = 'none';
            this.postForm.reset();
            document.getElementById('imagePreviewContainer').style.display = 'none';
            this.security.logSecurityEvent('✅ Reporte publicado. DNI→bcrypt | WhatsApp→AES-256.', 'success');
        } else {
            alert('Error al publicar.');
        }
    }

    // Global Methods called from inline onclick (PostController)
    editPost(id) {
        const newDesc = prompt("Edita la descripción:");
        if (newDesc !== null) {
            // Sanitizar antes de enviar
            if (this.security._detectXss(newDesc)) {
                alert("⚠️ Se detectó código malicioso. Edición bloqueada.");
                this.security.logSecurityEvent('🚨 Intento de XSS en edición — bloqueado.', 'alert');
                return;
            }
            this.postController.updatePost(id, newDesc);
        }
    }

    deletePost(id) {
        this.postController.deletePost(id);
    }

    // ── Chat Seguro — Ya NO recibe whatsapp, solo postId ────────────
    openChat(author, postId) {
        this.currentChatContact = author;
        this.currentChatPostId = postId;     // Solo el ID, el WhatsApp está cifrado en el servidor
        this.proofSent = false;
        
        const chatMsgs = document.getElementById('chatMessages');
        chatMsgs.innerHTML = `<div class="msg system">Iniciando handshake seguro con ${author}...</div>`;
        document.getElementById('acceptProofBtn').style.display = 'none';
        
        this.chatModal.style.display = 'flex';
        this.security.simulateKeyExchange(author);

        this.security.logSecurityEvent(`Chat con ${author} (Post #${postId}). WhatsApp protegido.`, 'info');
    }

    addChatMessage(text, type) {
        const chatMsgs = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type}`;
        msgDiv.textContent = text;
        chatMsgs.appendChild(msgDiv);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
}

// Init App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
