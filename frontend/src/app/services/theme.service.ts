import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private isDarkSubject = new BehaviorSubject<boolean>(true);
    public isDark$ = this.isDarkSubject.asObservable();

    constructor() {
        // Always enforce dark mode
        this.isDarkSubject.next(true);
        this.applyTheme(true);
        localStorage.setItem('theme', 'dark');
    }

    get isDark(): boolean {
        return this.isDarkSubject.value;
    }

    toggle(): void {
        // Disabled
        this.isDarkSubject.next(true);
        this.applyTheme(true);
    }

    private applyTheme(isDark: boolean): void {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
}
