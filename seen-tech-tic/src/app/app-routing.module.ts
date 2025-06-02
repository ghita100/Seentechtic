import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { PostsComponent } from './components/posts/posts.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PostsEditComponent } from './components/posts/posts-edit.component';

import { ReservationsComponent } from './components/reservations/reservations.component';


const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: HomeComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'posts', component: PostsComponent },
    { path: 'posts/edit/:id', component: PostsEditComponent },
      { path: 'reservations', component: ReservationsComponent },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
