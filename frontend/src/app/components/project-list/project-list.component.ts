import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectService, FALLBACK_PROJECTS } from '../../services/project.service';

@Component({
    selector: 'app-project-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './project-list.component.html',
    styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
    // Inicializar con datos inmediatamente para que aparezcan al cargar
    projects: Project[] = FALLBACK_PROJECTS;

    constructor(private projectService: ProjectService) { }

    ngOnInit(): void {
        // Intentar cargar desde API, pero ya tenemos datos del fallback
        this.projectService.getProjects().subscribe(data => {
            if (data && data.length > 0) {
                this.projects = data;
            }
        });
    }
}
