import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for *ngIf, *ngFor
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms'; // If we have input, but we use buttons here.

interface Message {
    text: string;
    sender: 'bot' | 'user';
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent {
    isOpen = false;
    messages: Message[] = [
        { text: '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?', sender: 'bot' }
    ];
    options = [
        { label: 'Ver Contacto', value: 'contact' },
        { label: '¿Buscas un desarrollador?', value: 'hire' },
        { label: 'Reportar fallo en un juego', value: 'report' },
    ];
    isLoading = false;

    constructor(private chatService: ChatService) { }

    toggleChat() {
        this.isOpen = !this.isOpen;
    }

    selectOption(option: { label: string, value: string }) {
        // Add user message
        this.messages.push({ text: option.label, sender: 'user' });
        this.isLoading = true;

        this.chatService.sendMessage(option.value).subscribe(response => {
            this.messages.push({ text: response.response, sender: 'bot' });
            this.isLoading = false;
        });
    }
}
