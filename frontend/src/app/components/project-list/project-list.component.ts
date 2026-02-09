import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for *ngFor
import { Project, ProjectService } from '../../services/project.service';

@Component({
    selector: 'app-project-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './project-list.component.html',
    styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
    projects: Project[] = [];

    constructor(private projectService: ProjectService) { }

    ngOnInit(): void {
        this.projectService.getProjects().subscribe(data => {
            this.projects = data;
        });
    }
}
