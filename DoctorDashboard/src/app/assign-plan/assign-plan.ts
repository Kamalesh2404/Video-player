import { Component, inject, OnInit } from '@angular/core';
import { ApiCalls } from '../services/api-calls';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-assign-plan',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './assign-plan.html',
  styleUrl: './assign-plan.css'
})
export class AssignPlan implements OnInit {
  selectedId: string | null = null;
  apicall = inject(ApiCalls);
  route = inject(ActivatedRoute);
  patientDetail: any;
  planType: "existing" | "new" = 'existing';
  wellnessPlan: any[] = [];
  doctorId: string | null = null;

  // Added the newPlan property here to fix the error
  newPlan = {
    planName: '',
    tasks: [] as { day: number, tasks: string[] }[]
  };

  clearForm() { }

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('patientId');
    this.doctorId = this.route.snapshot.paramMap.get('doctorId');

    if (patientId) {
      this.apicall.getPatientById(patientId).subscribe(data => {
        this.patientDetail = data;
      });
    }

    this.apicall.getWellnessPlan().subscribe(data => {
      this.wellnessPlan = data;
    });
  }

  addDay() {
    this.newPlan.tasks.push({ day: this.newPlan.tasks.length + 1, tasks: ['', ''] });
  }

  removeDay(dayIndex: number) {
    this.newPlan.tasks.splice(dayIndex, 1);
  }

  addTask(dayIndex: number) {
    this.newPlan.tasks[dayIndex].tasks.push('');
  }

  removeTask(dayIndex: number, taskIndex: number) {
    this.newPlan.tasks[dayIndex].tasks.splice(taskIndex, 1);
  }

  createAndAssignPlan() {
    if (!this.newPlan.planName || this.newPlan.tasks.length === 0) {
      alert('Plan name and tasks are required.');
      return;
    }

    this.apicall.addWellnessPlan(this.newPlan).pipe(
      switchMap((createdPlan: any) => {
        this.selectedId = createdPlan.id;
        return this.apicall.getWellnessPlan();
      }),
      switchMap(() => {
        return this.apicall.getWellnessPlan();
      })
    ).subscribe({
      next: (plans: any) => {
        this.wellnessPlan = plans;
        this.updatePatient();
      },
      error: (err) => {
        alert('Failed to create and assign plan. Please try again.');
      }
    });
  }

  updatePatient() {
    if (this.planType === 'new' && !this.selectedId) {
      alert('New plan ID is not set.');
      return;
    }
    if (!this.doctorId) {
      alert('Missing doctor ID.');
      return;
    }
    
    const selectedPlan = this.wellnessPlan.find(plan => plan.id === this.selectedId);

    if (!selectedPlan || !selectedPlan.tasks || !Array.isArray(selectedPlan.tasks)) {
      alert('Selected wellness plan not found or has invalid task data.');
      return;
    }
    
    this.patientDetail.doctor = this.doctorId;
    
    const newTrackerId = `tracker_${Date.now()}`;
    const newTracker = {
      id: newTrackerId,
      track: selectedPlan.tasks.map((_day: any, index: number) => [String(index + 1), "0", "0"])
    };

    const newProgressId = `progress_${Date.now()}`;
    const newProgress = {
      id: newProgressId,
      assignedDate: new Date().toISOString().slice(0, 10),
      endDate: null,
      patientId: this.patientDetail.id,
      planId: selectedPlan.id,
      doctorId: this.doctorId,
      trackerId: newTrackerId
    };

    this.apicall.updatePatient(this.patientDetail).pipe(
      switchMap(() => this.apicall.addTracker(newTracker)),
      switchMap(() => this.apicall.addProgress(newProgress))
    ).subscribe({
      next: () => {
        alert('Wellness plan assigned successfully!');
      },
      error: (err) => {
        alert('An error occurred. Please try again.');
      }
    });
  }
}
