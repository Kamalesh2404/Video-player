// dashboard-doctor.ts
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { ApiCalls } from '../../services/api-calls';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-doctor',
  imports: [],
  templateUrl: './dashboard-doctor.html',
  styleUrl: './dashboard-doctor.css'
})
export class DashboardDoctor implements OnInit {
  doctorInfo: any;
  patientDetails: any[] = [];
  unassigned: any[] = [];
  http = inject(HttpClient);
  callApi = inject(ApiCalls);
  router = inject(ActivatedRoute)
  route = inject(Router)
  docId:string | null = null;

  ngOnInit(): void {
    this.callApi.getDoctorById('3148').subscribe(data => {
      // The `data` is the object itself, so assign it directly
      this.doctorInfo = data;
      console.log(this.doctorInfo);
      this.docId=this.doctorInfo.id
    });

    this.callApi.getPatient().subscribe(data => {
      this.patientDetails = data.filter((p: any) => p.doctor === "3148")
      this.unassigned = data.filter((an: any) => an.doctor === null)
      console.log(this.unassigned)
      console.log(this.patientDetails)
    })
  }

  viewInfo(patientId:string) {
    this.route.navigate(['patientinfo',patientId])
  }

  assignPlan(patientId:string) {
    console.log(this.docId)
    this.route.navigate(['doctor',patientId,this.docId]) //i needed docId in assignpaln so i make this easy
  }
}