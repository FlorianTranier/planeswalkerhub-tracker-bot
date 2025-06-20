import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register a magic game")
  .addUserOption((option) =>
    option.setName("player1").setDescription("Player 1").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("commander1").setDescription("Commander 1").setRequired(true)
  )
  .addUserOption((option) =>
    option.setName("player2").setDescription("Player 2").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("commander2").setDescription("Commander 2").setRequired(true)
  )
  .addUserOption((option) =>
    option.setName("player3").setDescription("Player 3").setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("commander3")
      .setDescription("Commander 3")
      .setRequired(false)
  )
  .addUserOption((option) =>
    option.setName("player4").setDescription("Player 4").setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("commander4")
      .setDescription("Commander 4")
      .setRequired(false)
  )
  .addUserOption((option) =>
    option.setName("player5").setDescription("Player 5").setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("commander5")
      .setDescription("Commander 5")
      .setRequired(false)
  );

export const execute = async (interaction) => {
  const player1 = interaction.options.getUser("player1");
  const player2 = interaction.options.getUser("player2");
  const player3 = interaction.options.getUser("player3");
  const player4 = interaction.options.getUser("player4");
  const player5 = interaction.options.getUser("player5");

  const players = [player1, player2, player3, player4, player5].filter(
    (player) => player !== null
  );

  const modal = new ModalBuilder()
    .setCustomId("register-modal")
    .setTitle("Result of the game");

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const commander = interaction.options.getString(`commander${i + 1}`);
    const input = new TextInputBuilder()
      .setCustomId(`player-${i}-position`)
      .setLabel(
        `${player.username} / ${commander} (position 1 to ${players.length})`
      )
      .setPlaceholder("Enter player's position")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
};

export default { data, execute };
