class SecurityService {
    constructor() {
        // Patrones XSS ampliados — OWASP A03:2021 (Inyección)
        // Detecta: <script>, javascript:, event handlers (onerror, onload, onclick, etc.),
        // <img>, <svg>, <iframe>, <object>, <embed>, <link>, data: URIs maliciosos
        this.xssPatterns = [
            /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
            /javascript\s*:/gi,
            /on\w+\s*=\s*["']?[^"'>]+["']?/gi,    // event handlers: onerror=, onload=, etc.
            /<img\b[^>]*\bon\w+\s*=/gi,             // <img onerror=...>
            /<svg\b[^>]*>/gi,                        // <svg> payloads
            /<iframe\b[^>]*>/gi,                     // <iframe> injection
            /<object\b[^>]*>/gi,                     // <object> injection
            /<embed\b[^>]*>/gi,                      // <embed> injection
            /<link\b[^>]*>/gi,                       // <link> injection
            /data\s*:\s*text\/html/gi,               // data:text/html payloads
            /expression\s*\(/gi,                     // CSS expression()
            /url\s*\(\s*['"]?\s*javascript/gi        // url(javascript:...)
        ];

        this.logElement = document.getElementById('cryptoLog');
        this.ormLogElement = document.getElementById('ormLog');
    }

    logSecurityEvent(message, type = 'info') {
        if (!this.logElement) return;
        
        const p = document.createElement('p');
        p.className = `${type}-msg`;
        
        const timestamp = new Date().toLocaleTimeString();
        p.textContent = `[${timestamp}] ${message}`;
        
        this.logElement.appendChild(p);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    validateName(name) {
        const isValid = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name);
        if (!isValid && name.length > 0) {
            this.logSecurityEvent(`Validación fallida: Caracteres inválidos en nombre.`, 'alert');
        }
        return isValid;
    }

    validateDni(dni) {
        return /^\d{8}$/.test(dni);
    }

    validatePhone(phone) {
        return /^\d{9}$/.test(phone);
    }

    // ── Detección XSS multi-patrón ──────────────────────────────────
    _detectXss(input) {
        for (const pattern of this.xssPatterns) {
            pattern.lastIndex = 0; // reset regex state
            if (pattern.test(input)) {
                return true;
            }
        }
        return false;
    }

    // OWASP A03:2021 (Inyección) - Sanitización de input
    sanitizeInput(input) {
        if (this._detectXss(input)) {
            this.logSecurityEvent(`⚠️ BLOQUEADO: Inyección XSS detectada en texto.`, 'alert');
            alert("⚠️ Inyección XSS detectada y bloqueada");
            // Limpiar todo el contenido malicioso
            return input.replace(/<[^>]*>/g, '').replace(/on\w+\s*=\s*["']?[^"'>]+["']?/gi, '[BLOQUEADO]');
        }
        return input;
    }

    // ── Analizador de campos del formulario (Modo Admin) ────────────
    analyzeFormField(fieldName, value) {
        if (!value || value.length === 0) return { safe: true, value };

        this.logSecurityEvent(`Analizando campo [${fieldName}]: "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"`, 'info');

        if (this._detectXss(value)) {
            this.logSecurityEvent(`🚨 PAYLOAD MALICIOSO en [${fieldName}]: "${value}"`, 'alert');
            this.logSecurityEvent(`   Vector: Inyección de código — Bloqueado por RegEx client-side`, 'alert');
            return { safe: false, value: '' };
        }

        this.logSecurityEvent(`✅ Campo [${fieldName}] limpio.`, 'success');
        return { safe: true, value };
    }

    // OWASP A02:2021 (Criptografía) - Simulate Key Exchange
    simulateKeyExchange(contactName) {
        this.logSecurityEvent(`Iniciando handshake seguro con ${contactName}...`, 'info');
        
        setTimeout(() => {
            this.logSecurityEvent(`Generando par de llaves (RSA-2048)...`, 'sys');
        }, 800);

        setTimeout(() => {
            this.logSecurityEvent(`Intercambiando Llave Pública con ${contactName}...`, 'sys');
        }, 1600);

        setTimeout(() => {
            this.logSecurityEvent(`¡Conexión cifrada de extremo a extremo establecida!`, 'success');
        }, 2400);
    }

    encryptMessageSim(message) {
        // Simple visual simulation of encryption
        return btoa(unescape(encodeURIComponent(message))).substring(0, 20) + "...";
    }

    // ── Análisis en tiempo real para búsqueda (Modo Admin) ──────────
    realTimeSearchAnalysis(input) {
        this.logSecurityEvent(`Analizando entrada... [${input.slice(-1)}]`, 'info');
        if (this._detectXss(input)) {
            this.logSecurityEvent(`⚠️ Inyección XSS detectada y bloqueada en búsqueda. Payload: ${input}`, 'alert');
            alert("⚠️ Inyección JS detectada y bloqueada");
            return ""; // Clear input or block
        }
        return input;
    }

    // ── Log ORM visual ──────────────────────────────────────────────
    logOrmOperation(op, table, data) {
        if (!this.ormLogElement) return;
        const p = document.createElement('p');
        p.className = 'orm-msg';
        const timestamp = new Date().toLocaleTimeString();
        
        let query = '';
        if (op === 'INSERT') {
            query = `<span class="orm-kw">INSERT INTO</span> ${table} (<span class="orm-str">${Object.keys(data).join(', ')}</span>) <span class="orm-kw">VALUES</span> (...)`;
        } else if (op === 'UPDATE') {
            query = `<span class="orm-kw">UPDATE</span> ${table} <span class="orm-kw">SET</span> description=<span class="orm-str">"${data.description.substring(0,20)}..."</span> <span class="orm-kw">WHERE</span> id=<span class="orm-num">${data.id}</span>`;
        } else if (op === 'DELETE') {
            query = `<span class="orm-kw">DELETE FROM</span> ${table} <span class="orm-kw">WHERE</span> id=<span class="orm-num">${data.id}</span>`;
        } else if (op === 'SELECT') {
            query = `<span class="orm-kw">SELECT * FROM</span> ${table} <span class="orm-kw">ORDER BY</span> date <span class="orm-kw">DESC</span>`;
        } else if (op === 'DECRYPT') {
            query = `<span class="orm-kw">DECRYPT</span>(<span class="orm-str">whatsapp</span>) <span class="orm-kw">FROM</span> ${table} <span class="orm-kw">WHERE</span> id=<span class="orm-num">${data.id}</span>`;
        }

        p.innerHTML = `[${timestamp}] ${query}`;
        this.ormLogElement.appendChild(p);
        this.ormLogElement.scrollTop = this.ormLogElement.scrollHeight;
    }
}

window.SecurityService = SecurityService;
