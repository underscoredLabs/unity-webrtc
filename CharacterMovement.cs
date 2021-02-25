using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CharacterMovement : MonoBehaviour
{
    [SerializeField]
    private float speed = 0.1f;

    void Update()
    {
        float xDirection = Input.GetAxis("Horizontal");
        float zDirection = Input.GetAxis("Vertical");
        Vector3 moveDirection = new Vector3(xDirection, 0f, zDirection);
        transform.position += moveDirection * speed;
    }
}
