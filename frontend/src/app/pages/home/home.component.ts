import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
import { ChatbotComponent } from '../../components/chatbot/chatbot.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, ProjectListComponent, ChatbotComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    title = 'Game Developer Portfolio';
}
