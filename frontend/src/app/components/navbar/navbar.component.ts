import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
    isMenuOpen = false;
    isScrolled = false;

    constructor(
        public authService: AuthService,
        public themeService: ThemeService
    ) {
        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', () => {
                this.isScrolled = window.scrollY > 50;
            });
        }
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
    }


    logout() {
        this.authService.logout();
        this.isMenuOpen = false;
    }
}
