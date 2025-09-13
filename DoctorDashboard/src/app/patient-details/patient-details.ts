import { Component, inject, OnInit } from '@angular/core';
import { ApiCalls } from '../services/api-calls';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-patient-details',
  imports: [],
  templateUrl: './patient-details.html',
  styleUrl: './patient-details.css'
})
export class PatientDetails implements OnInit {
  patientsDetail: any;
  patientProgress: any[] = [];
  wellnessPlanAssigned: any;
  trackerDetails: any;

  apicall = inject(ApiCalls)
  route = inject(ActivatedRoute)
  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id')

    if (id) {
      this.apicall.getPatient().subscribe(data => {
        this.patientsDetail = data.filter((p:any)=> p.id === id)[0] //this api will return array of object if i put data[0] then it will filter only one array which is nt unseful
        //error happened & fixed The correct way to filter the patient data is to call .filter() directly on the data array itself. After filtering, the result will still be an array, but with only one item. To get that single item, you can access the first element ([0]).
        //This makes this.patientsDetail a single object, not an array.
        //When you use the filter method, it always returns an array, even if it only finds one matching item.

        console.log(this.patientsDetail)
      })
      this.apicall.getProgressByPatientId(id).subscribe(data => {
        this.patientProgress = data
        console.log(this.patientProgress)

      })
    }



  }
  showPlan(id: string) {
    this.apicall.getWellnessPlanById(id).subscribe(data => {
      this.wellnessPlanAssigned = [data]; // Fixed: Wrap the object in an array
      console.log(this.wellnessPlanAssigned)

    })
  }

  getTracker() {
    this.apicall.getTracker(this.patientProgress[0].trackerId).subscribe((data: any) => {
      this.trackerDetails = data;
      console.log(this.trackerDetails)
    })
  }
  
  // This function will fetch the tracker details and then perform the logic
  getStatus(day: any) {
    this.apicall.getTracker(this.patientProgress[0].trackerId).subscribe((data: any) => {
      this.trackerDetails = data;
      console.log(`Getting status for day: ${day}`);
      console.log("Full tracker details:", this.trackerDetails);
      // Now you can add your logic to find the status for the given day.
      // For example, you can loop through this.trackerDetails.track to find the matching day.
    });
  }

}