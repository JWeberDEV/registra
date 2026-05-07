#!/bin/bash

# XPIRIA Installation Script
# Automated installer for XPIRIA Financial System
# Version: 1.0.0
# Author: XPIRIA Team

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/xpiria_install.log"
NODE_VERSION="18"
POSTGRES_VERSION="14"
APP_USER="xpiria"
APP_DIR="/opt/xpiria"
SERVICE_NAME="xpiria"

# ASCII Art Function
show_xpiria_header() {
    clear
    echo -e "${PURPLE}"
    cat << "EOF"
 ▄         ▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░▌       ▐░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌ ▀▀▀▀█░█▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░▌       ▐░▌▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌     ▐░▌     ▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌     ▐░▌     ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░▌       ▐░▌     ▐░▌     ▐░█▀▀▀▀█░█▀▀ ▐░█▀▀▀▀▀▀▀█░▌
▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌     ▐░▌     ▐░▌     ▐░▌  ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌          ▐░█▄▄▄▄▄▄▄█░▌ ▄▄▄▄█░█▄▄▄▄ ▐░▌      ▐░▌ ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌          ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░▌       ▐░▌
 ▀         ▀  ▀            ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀  ▀         ▀ 
EOF
    echo -e "${NC}"
    echo -e "${WHITE}          SISTEMA FINANCEIRO AUTOMATIZADO - INSTALADOR${NC}"
    echo -e "${CYAN}                    Versão 1.0.0${NC}"
    echo ""
}

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    echo -e "${RED}Instalação falhou. Verifique o log em: $LOG_FILE${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script deve ser executado como root (use sudo)"
    fi
}

# Detect OS
detect_os() {
    show_xpiria_header
    log "INFO" "Detectando sistema operacional..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        error_exit "Sistema operacional não suportado"
    fi
    
    log "INFO" "Sistema detectado: $OS $VER"
    
    case $OS in
        "ubuntu"|"debian")
            PACKAGE_MANAGER="apt-get"
            ;;
        "centos"|"rhel"|"fedora")
            PACKAGE_MANAGER="yum"
            ;;
        *)
            error_exit "Sistema operacional não suportado: $OS"
            ;;
    esac
}

# Check system requirements
check_requirements() {
    show_xpiria_header
    log "INFO" "Verificando requisitos do sistema..."
    
    # Check available disk space (minimum 2GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local min_space=$((2 * 1024 * 1024)) # 2GB in KB
    
    if [[ $available_space -lt $min_space ]]; then
        error_exit "Espaço em disco insuficiente. Mínimo: 2GB, Disponível: $(($available_space/1024/1024))GB"
    fi
    
    # Check memory (minimum 1GB)
    local total_mem=$(free -m | awk 'NR==2{print $2}')
    if [[ $total_mem -lt 1024 ]]; then
        log "WARN" "Memória RAM baixa detectada: ${total_mem}MB (mínimo recomendado: 1GB)"
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        error_exit "Conexão com internet necessária para instalação"
    fi
    
    log "INFO" "Requisitos do sistema verificados com sucesso"
    sleep 2
}

# Update system packages
update_system() {
    show_xpiria_header
    log "INFO" "Atualizando repositórios do sistema..."
    
    case $PACKAGE_MANAGER in
        "apt-get")
            apt-get update -y || error_exit "Falha ao atualizar repositórios"
            apt-get upgrade -y || error_exit "Falha ao atualizar sistema"
            ;;
        "yum")
            yum update -y || error_exit "Falha ao atualizar sistema"
            ;;
    esac
    
    log "INFO" "Sistema atualizado com sucesso"
    sleep 2
}

# Install basic dependencies
install_basic_deps() {
    show_xpiria_header
    log "INFO" "Instalando dependências básicas..."
    
    case $PACKAGE_MANAGER in
        "apt-get")
            apt-get install -y curl wget gnupg2 software-properties-common \
                build-essential git python3 python3-pip \
                libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
                libvips-dev || error_exit "Falha ao instalar dependências básicas"
            ;;
        "yum")
            yum groupinstall -y "Development Tools"
            yum install -y curl wget gnupg2 git python3 python3-pip \
                cairo-devel pango-devel libjpeg-turbo-devel giflib-devel \
                librsvg2-devel vips-devel || error_exit "Falha ao instalar dependências básicas"
            ;;
    esac
    
    log "INFO" "Dependências básicas instaladas com sucesso"
    sleep 2
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null; then
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge $NODE_VERSION ]]; then
            log "INFO" "Node.js já instalado (versão $(node --version))"
            return 0
        else
            log "WARN" "Node.js versão antiga detectada. Atualizando..."
            return 1
        fi
    else
        log "INFO" "Node.js não encontrado. Será instalado."
        return 1
    fi
}

# Install Node.js
install_nodejs() {
    show_xpiria_header
    log "INFO" "Instalando Node.js $NODE_VERSION..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - || error_exit "Falha ao configurar repositório NodeSource"
    
    case $PACKAGE_MANAGER in
        "apt-get")
            apt-get install -y nodejs || error_exit "Falha ao instalar Node.js"
            ;;
        "yum")
            yum install -y nodejs || error_exit "Falha ao instalar Node.js"
            ;;
    esac
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        error_exit "Node.js não foi instalado corretamente"
    fi
    
    log "INFO" "Node.js instalado com sucesso (versão $(node --version))"
    log "INFO" "npm versão: $(npm --version)"
    sleep 2
}

# Check if PostgreSQL is installed
check_postgresql() {
    if command -v psql &> /dev/null; then
        log "INFO" "PostgreSQL já instalado"
        return 0
    else
        log "INFO" "PostgreSQL não encontrado. Será instalado."
        return 1
    fi
}

# Install PostgreSQL
install_postgresql() {
    show_xpiria_header
    log "INFO" "Instalando PostgreSQL $POSTGRES_VERSION..."
    
    case $PACKAGE_MANAGER in
        "apt-get")
            apt-get install -y postgresql postgresql-contrib || error_exit "Falha ao instalar PostgreSQL"
            ;;
        "yum")
            yum install -y postgresql-server postgresql-contrib || error_exit "Falha ao instalar PostgreSQL"
            postgresql-setup initdb
            ;;
    esac
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log "INFO" "PostgreSQL instalado e iniciado com sucesso"
    sleep 2
}

# Configure database
configure_database() {
    show_xpiria_header
    log "INFO" "Configurando banco de dados..."
    
    echo -e "${YELLOW}Configuração do Banco de Dados${NC}"
    echo "Por favor, forneça as informações do banco de dados:"
    echo ""
    
    read -p "Host do banco (padrão: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Porta do banco (padrão: 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Nome do banco de dados: " DB_NAME
    while [[ -z "$DB_NAME" ]]; do
        read -p "Nome do banco de dados (obrigatório): " DB_NAME
    done
    
    read -p "Usuário do banco: " DB_USER
    while [[ -z "$DB_USER" ]]; do
        read -p "Usuário do banco (obrigatório): " DB_USER
    done
    
    read -s -p "Senha do banco: " DB_PASSWORD
    echo ""
    while [[ -z "$DB_PASSWORD" ]]; do
        read -s -p "Senha do banco (obrigatório): " DB_PASSWORD
        echo ""
    done
    
    # Test database connection
    log "INFO" "Testando conexão com banco de dados..."
    
    export PGPASSWORD=$DB_PASSWORD
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "\q" 2>/dev/null; then
        log "INFO" "Conexão com banco de dados estabelecida com sucesso"
    else
        error_exit "Falha ao conectar com banco de dados. Verifique as credenciais."
    fi
    
    # Create database if it doesn't exist
    if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log "INFO" "Criando banco de dados $DB_NAME..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" || error_exit "Falha ao criar banco de dados"
    else
        log "INFO" "Banco de dados $DB_NAME já existe"
    fi
    
    unset PGPASSWORD
    
    log "INFO" "Configuração do banco de dados concluída"
    sleep 2
}

# Create application user
create_app_user() {
    show_xpiria_header
    log "INFO" "Criando usuário da aplicação..."
    
    if ! id "$APP_USER" &>/dev/null; then
        useradd -r -m -s /bin/bash $APP_USER || error_exit "Falha ao criar usuário da aplicação"
        log "INFO" "Usuário $APP_USER criado com sucesso"
    else
        log "INFO" "Usuário $APP_USER já existe"
    fi
    
    # Create application directory
    mkdir -p $APP_DIR
    chown $APP_USER:$APP_USER $APP_DIR
    
    log "INFO" "Diretório da aplicação configurado: $APP_DIR"
    sleep 2
}

# Setup application
setup_application() {
    show_xpiria_header
    log "INFO" "Configurando aplicação XPIRIA..."
    
    # Copy application files
    log "INFO" "Copiando arquivos da aplicação..."
    cp -r $SCRIPT_DIR/* $APP_DIR/ || error_exit "Falha ao copiar arquivos da aplicação"
    chown -R $APP_USER:$APP_USER $APP_DIR
    
    # Switch to app user for npm operations
    sudo -u $APP_USER bash << EOF
cd $APP_DIR

# Install dependencies
npm install || exit 1

# Create .env file
if [[ ! -f .env ]]; then
    cp production.env.example .env || exit 1
fi
EOF
    
    if [[ $? -ne 0 ]]; then
        error_exit "Falha ao instalar dependências npm"
    fi
    
    # Configure environment variables
    log "INFO" "Configurando variáveis de ambiente..."
    
    local session_secret=$(openssl rand -hex 64)
    local database_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    
    cat > $APP_DIR/.env << EOF
# Ambiente
NODE_ENV=production
TZ=America/Sao_Paulo
PORT=5000

# Banco de dados
DATABASE_URL=$database_url

# Configurações de sessão
SESSION_SECRET=$session_secret

# Configurações de aplicação
API_RATE_LIMIT=100
MAX_FILE_SIZE=10MB
BASE_URL=http://localhost:5000
EOF
    
    chown $APP_USER:$APP_USER $APP_DIR/.env
    chmod 600 $APP_DIR/.env
    
    log "INFO" "Variáveis de ambiente configuradas"
    sleep 2
}

# Build application
build_application() {
    show_xpiria_header
    log "INFO" "Compilando aplicação..."
    
    sudo -u $APP_USER bash << EOF
cd $APP_DIR

# Run TypeScript check
npm run check || exit 1

# Build application
npm run build || exit 1

# Run database migrations
npm run start:migration || exit 1
EOF
    
    if [[ $? -ne 0 ]]; then
        error_exit "Falha ao compilar aplicação"
    fi
    
    log "INFO" "Aplicação compilada com sucesso"
    sleep 2
}

# Create systemd service
create_systemd_service() {
    show_xpiria_header
    log "INFO" "Criando serviço systemd..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=XPIRIA Financial System
Documentation=https://github.com/xpiria/xpiria
After=network.target postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    log "INFO" "Serviço systemd criado e habilitado"
    sleep 2
}

# Configure firewall
configure_firewall() {
    show_xpiria_header
    log "INFO" "Configurando firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 5000/tcp
        log "INFO" "Porta 5000 liberada no firewall (ufw)"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=5000/tcp
        firewall-cmd --reload
        log "INFO" "Porta 5000 liberada no firewall (firewalld)"
    else
        log "WARN" "Nenhum firewall detectado. Configure manualmente se necessário."
    fi
    
    sleep 2
}

# Start application
start_application() {
    show_xpiria_header
    log "INFO" "Iniciando aplicação XPIRIA..."
    
    systemctl start $SERVICE_NAME || error_exit "Falha ao iniciar aplicação"
    
    # Wait for application to start
    sleep 5
    
    # Check if application is running
    if systemctl is-active --quiet $SERVICE_NAME; then
        log "INFO" "Aplicação iniciada com sucesso"
    else
        error_exit "Aplicação falhou ao iniciar. Verifique os logs: journalctl -u $SERVICE_NAME"
    fi
    
    sleep 2
}

# Validate installation
validate_installation() {
    show_xpiria_header
    log "INFO" "Validando instalação..."
    
    # Check if service is running
    if ! systemctl is-active --quiet $SERVICE_NAME; then
        error_exit "Serviço não está rodando"
    fi
    
    # Check if application responds
    sleep 3
    if curl -f http://localhost:5000 &>/dev/null; then
        log "INFO" "Aplicação respondendo na porta 5000"
    else
        log "WARN" "Aplicação pode estar iniciando. Aguarde alguns minutos."
    fi
    
    # Check database connection
    export PGPASSWORD=$DB_PASSWORD
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\q" 2>/dev/null; then
        log "INFO" "Conexão com banco de dados funcionando"
    else
        log "WARN" "Problema com conexão de banco de dados"
    fi
    unset PGPASSWORD
    
    log "INFO" "Validação concluída"
    sleep 2
}

# Show final summary
show_summary() {
    show_xpiria_header
    echo -e "${GREEN}🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🎉${NC}"
    echo ""
    echo -e "${WHITE}Resumo da Instalação:${NC}"
    echo -e "${CYAN}• Sistema:${NC} $OS $VER"
    echo -e "${CYAN}• Node.js:${NC} $(node --version)"
    echo -e "${CYAN}• PostgreSQL:${NC} Instalado e configurado"
    echo -e "${CYAN}• Aplicação:${NC} $APP_DIR"
    echo -e "${CYAN}• Serviço:${NC} $SERVICE_NAME"
    echo -e "${CYAN}• Porta:${NC} 5000"
    echo ""
    echo -e "${WHITE}URLs de Acesso:${NC}"
    echo -e "${GREEN}• Aplicação:${NC} http://localhost:5000"
    echo -e "${GREEN}• Aplicação (IP externo):${NC} http://$(hostname -I | awk '{print $1}'):5000"
    echo ""
    echo -e "${WHITE}Comandos Úteis:${NC}"
    echo -e "${YELLOW}• Status do serviço:${NC} systemctl status $SERVICE_NAME"
    echo -e "${YELLOW}• Logs da aplicação:${NC} journalctl -u $SERVICE_NAME -f"
    echo -e "${YELLOW}• Reiniciar aplicação:${NC} systemctl restart $SERVICE_NAME"
    echo -e "${YELLOW}• Parar aplicação:${NC} systemctl stop $SERVICE_NAME"
    echo ""
    echo -e "${WHITE}Arquivos Importantes:${NC}"
    echo -e "${BLUE}• Configuração:${NC} $APP_DIR/.env"
    echo -e "${BLUE}• Logs de instalação:${NC} $LOG_FILE"
    echo -e "${BLUE}• Serviço systemd:${NC} /etc/systemd/system/$SERVICE_NAME.service"
    echo ""
    echo -e "${GREEN}Instalação realizada com sucesso!${NC}"
    echo -e "${YELLOW}Acesse a aplicação pelo navegador e configure seu usuário administrador.${NC}"
    echo ""
}

# Main installation flow
main() {
    # Initialize log file
    echo "XPIRIA Installation Log - $(date)" > "$LOG_FILE"
    
    log "INFO" "Iniciando instalação do XPIRIA Financial System"
    
    # Check if running as root
    check_root
    
    # Detect operating system
    detect_os
    
    # Check system requirements
    check_requirements
    
    # Update system
    update_system
    
    # Install basic dependencies
    install_basic_deps
    
    # Check and install Node.js
    if ! check_nodejs; then
        install_nodejs
    fi
    
    # Check and install PostgreSQL
    if ! check_postgresql; then
        install_postgresql
    fi
    
    # Configure database
    configure_database
    
    # Create application user
    create_app_user
    
    # Setup application
    setup_application
    
    # Build application
    build_application
    
    # Create systemd service
    create_systemd_service
    
    # Configure firewall
    configure_firewall
    
    # Start application
    start_application
    
    # Validate installation
    validate_installation
    
    # Show summary
    show_summary
    
    log "INFO" "Instalação do XPIRIA concluída com sucesso"
}

# Trap errors and cleanup
trap 'error_exit "Instalação interrompida"' INT TERM

# Run main function
main "$@"