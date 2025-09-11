import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Authentication {
  private doctorApiUrl = 'http://localhost:3000/doctors';
  private patientApiUrl = 'http://localhost:3000/patients';

  constructor(private http: HttpClient) {}

  getDoctors(): Observable<any> {
    return this.http.get(this.doctorApiUrl);
  }

  addDoctor(doctor: any): Observable<any> {
    return this.http.post(this.doctorApiUrl, doctor);
  }

  getPatients(): Observable<any> {
    return this.http.get(this.patientApiUrl);
  }

  addPatient(patient: any): Observable<any> {
    return this.http.post(this.patientApiUrl, patient);
  }
}
