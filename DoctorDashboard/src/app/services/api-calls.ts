import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiCalls {
  http = inject(HttpClient);
  private api = 'http://localhost:3000';

  getDoctorById(id: string): Observable<any> {
    return this.http.get<any>(`${this.api}/doctors/${id}`);
  }

  getPatientById(id: string): Observable<any> {
    return this.http.get<any>(`${this.api}/patients/${id}`);
  }
  
  getPatient(): Observable<any> {
    return this.http.get(`${this.api}/patients/`);
  }

  getProgressByPatientId(id: string): Observable<any> {
    return this.http.get(`${this.api}/progress/?patientId=${id}`);
  }

  getWellnessPlanById(id: string): Observable<any> {
    return this.http.get(`${this.api}/wellnessPlans/${id}`);
  }

  getWellnessPlan(): Observable<any> {
    return this.http.get(`${this.api}/wellnessPlans/`);
  }

  getTracker(id: string): Observable<any> {
    return this.http.get(`${this.api}/tracker/${id}`);
  }

  updatePatient(patientToUpdate: any): Observable<any> {
    return this.http.patch(`${this.api}/patients/${patientToUpdate.id}`, patientToUpdate);
  }

  addTracker(newTracker: any): Observable<any> {
    return this.http.post(`${this.api}/tracker`, newTracker);
  }

  addProgress(newProgress: any): Observable<any> {
    return this.http.post(`${this.api}/progress`, newProgress);
  }

  addWellnessPlan(newPlan: any): Observable<any> {
    return this.http.post(`${this.api}/wellnessPlans`, newPlan);
  }
}