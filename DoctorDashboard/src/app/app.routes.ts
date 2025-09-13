import { Routes } from '@angular/router';
import { DashboardDoctor } from './Dashboard/dashboard-doctor/dashboard-doctor';
import { PatientDetails } from './patient-details/patient-details';
import { AssignPlan } from './assign-plan/assign-plan';

export const routes: Routes = [

    {
        path: 'dashboard',
        component: DashboardDoctor
    },
    {
        path:'',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'patientinfo/:id',
        component:PatientDetails
    },
    {
        path:'doctor/:patientId/:doctorId',
        component: AssignPlan
    },
    {
        path:'**',
        redirectTo: 'dashboard'
    }
];
