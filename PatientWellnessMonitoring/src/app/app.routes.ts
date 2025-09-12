import { Routes } from '@angular/router';
import { Login } from './Components/login/login';
import { Signup } from './Components/signup/signup';

export const routes: Routes = [
    {
        path: 'login',
        component: Login
    },
    {
        path: 'signup',
        component: Signup,
    },
    // {
    //     path: 'doctor',
    //     // canActivate: [authGuard, doctorGuard],
    //     component: DoctorDashboard
    // },
    // {
    //     path: 'doctor/assign-plans',
    //     component: WellnessPlan
    // },
    // {
    //     path: 'doctor/create-plan',
    //     canActivate: [authGuard, doctorGuard],
    //     component: CreatePlanPageComponent
    // },
    // {
    //     path: 'doctor/patient-progress/:id',
    //     canActivate: [authGuard, doctorGuard],
    //     component: PatientProgressPageComponent
    // },
    // {
    //     path: 'patient',
    //     component: PatientDashboard
    // },
    // {
    //     path: '',
    //     redirectTo: 'login',
    //     pathMatch: 'full'
    // },
    // {
    //     path: '**',
    //     redirectTo: 'login' // Redirect to login for any unknown paths
    // }
];

