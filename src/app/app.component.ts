import { Component, inject, signal } from '@angular/core';
import { HomeComponent } from './components/home/home.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [HomeComponent, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'inventory-app';
  isNoHeaderRoute: boolean = false;
  router = inject(Router);

  ngOnInit() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      // in the future, add public routes here.
      const isNoHeaderRoute = ['orders/tag-references'];
      this.isNoHeaderRoute = isNoHeaderRoute.some((route) => this.router.url.includes(route));
    });
  }
}
