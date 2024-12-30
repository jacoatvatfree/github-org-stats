export async function analyzeOrganization(orgName, repository, presenter) {
  try {
    const organization = await repository.getOrganization(orgName);
    
    const analysis = {
      name: organization.name,
      totalStars: organization.getTotalStars(),
      topRepos: organization.getMostPopularRepos(),
      topContributors: organization.getMostActiveContributors(),
      memberCount: organization.members.length
    };

    presenter.display(analysis);
  } catch (error) {
    presenter.displayError(error);
  }
}
