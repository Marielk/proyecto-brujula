"use client";

import { AppFooter, AppNav, GardenMode, JourneyMode, ModeLanding, ProfileWizard } from "./components/BrujulaViews";
import { useJourney } from "./hooks/useJourney";

export default function BrujulaApp() {
  const state = useJourney();
  const { actions } = state;

  return (
    <main className={state.showProfileForm ? "shell profileCanvas" : "appCanvas"}>
      {state.showProfileForm ? (
        <ProfileWizard
          profile={state.profile}
          step={state.step}
          validation={state.validation}
          onUpdate={actions.updateProfile}
          onStep={actions.setStep}
          onSaveDraft={() => actions.saveProfile(state.profile)}
          onFinish={() => actions.saveProfile(state.profile)}
          canFinish={state.canFinish}
        />
      ) : (
        <>
          <AppNav mode={state.mode} onMode={actions.navigateMode} onEditProfile={actions.editProfile} />
          {state.mode === "home" && <ModeLanding profile={state.profile} onMode={actions.navigateMode} />}
          {state.mode === "garden" && (
            <GardenMode
              checkIn={state.checkIn}
              indicators={state.indicators}
              moodLine={state.moodLine}
              recommendation={state.ritual}
              outcome={state.ritualOutcome}
              onCheckIn={actions.updateCheckIn}
              onOutcome={actions.recordOutcome}
            />
          )}
          {state.mode === "journey" && (
            <JourneyMode
              profile={state.profile}
              profileMessage={state.profileMessage}
              flow={state.journeyFlow}
              text={state.text}
              model={state.model}
              result={state.result}
              error={state.error}
              isLoading={state.isLoading}
              onText={actions.setText}
              onModel={actions.setModel}
              onSubmit={actions.submit}
              onCancel={actions.cancelJourney}
              onRetry={actions.retryJourney}
              onEditGoal={actions.editJourneyGoal}
              onNewJourney={actions.newJourney}
              onEditProfile={actions.editProfile}
              onDeleteProfile={actions.deleteProfile}
            />
          )}
          <AppFooter />
        </>
      )}
    </main>
  );
}
