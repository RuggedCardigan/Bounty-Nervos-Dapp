pragma solidity >=0.8.0;

contract BossFight {
  int lives;
  int bossHealth;
  int normalHit = 1;
  int crit = 4;
  bool critical;
  bool gameOver;
  int bossdmg = 2;

  constructor() payable {
    bossHealth = 10;
  }

  function setLives(int hearts) public payable {
    lives = hearts;
  }

  function getBossHealth() public view returns (int) {
    return bossHealth;
  }

  function getMyLives() public view returns (int) {
    return lives;
  }

  function Attack() public payable {
    uint blockNumber = block.number;
    critical = false;
    lives -= bossdmg;

    if (gameOver == true){
     revert("Disabled. Game is over!");
    }

    else if (blockNumber % 3 == 0){
      bossHealth -= crit;
      critical = true;
    }
    else {
      bossHealth -= normalHit;
    }

    if (bossHealth <= 0 || lives <= 0){
      gameOver = true;
    }
  }
}